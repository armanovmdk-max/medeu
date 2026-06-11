// AgroAssist AI — holographic field background (Three.js).
// Single source of truth used by both index.html (static, via importmap)
// and AgroHologramBackground.jsx (bundler resolves `three` from npm).
//
// `three/addons/*` resolves to `three/examples/jsm/*` in npm builds, and is
// remapped to ./vendor/jsm/ by the importmap in index.html.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/**
 * Mount the animated holographic background onto a <canvas>.
 * @param {HTMLCanvasElement} canvas
 * @param {{ onReady?: () => void }} [opts]
 * @returns {{ dispose: () => void }}
 */
export function mountAgroHologram(canvas, opts = {}) {
  const COLORS = {
    cyan:  new THREE.Color('#00E5FF'),
    blue:  new THREE.Color('#0A84FF'),
    green: new THREE.Color('#23F5A6'),
    gold:  new THREE.Color('#FFC34D'),
    wheat: new THREE.Color('#E8D98A'),
    pea:   new THREE.Color('#5FD08A'),
    lentil:new THREE.Color('#7BE8B8'),
  };

  // 5 crop bands across X — order matches the on-screen legend
  const BANDS = [
    { name:'sunflower', color:COLORS.gold,   x:-20 },
    { name:'wheat',     color:COLORS.wheat,  x:-10 },
    { name:'chickpea',  color:COLORS.green,  x:  0 },
    { name:'lentil',    color:COLORS.lentil, x: 10 },
    { name:'pea',       color:COLORS.pea,    x: 20 },
  ];
  const FIELD_LEN = 220;   // depth of scrolling field
  const SCROLL = 7.0;      // world units / sec toward camera => "flying forward"

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
  renderer.setClearColor(0x03070d, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03070d, 0.018);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  camera.position.set(0, 7.5, 26);
  camera.lookAt(0, 2.5, -30);

  scene.add(new THREE.HemisphereLight(0x0a3a55, 0x020308, 0.6));
  const key = new THREE.PointLight(0x00e5ff, 0.6, 200); key.position.set(0,40,30); scene.add(key);

  // ---- 1) holographic ground: infinite scrolling grid, coloured by band ----
  const groundMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{
      uTime:{value:0}, uScroll:{value:0},
      uCyan:{value:COLORS.cyan}, uGreen:{value:COLORS.green}, uGold:{value:COLORS.gold},
    },
    vertexShader:`
      varying vec3 vWorld;
      void main(){
        vec4 w = modelMatrix * vec4(position,1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader:`
      precision highp float;
      varying vec3 vWorld;
      uniform float uTime, uScroll;
      uniform vec3 uCyan, uGreen, uGold;
      float gridLine(vec2 p, float scale){
        vec2 c = p*scale;
        vec2 g = abs(fract(c-0.5)-0.5)/fwidth(c);
        return 1.0 - min(min(g.x,g.y),1.0);
      }
      void main(){
        vec2 p = vWorld.xz; p.y += uScroll;
        float fine  = gridLine(p, 1.0);
        float coarse= gridLine(p, 0.2)*1.4;
        float g = clamp(fine*0.5 + coarse, 0.0, 1.6);
        float band = vWorld.x;
        vec3 col;
        if(band < -15.0)      col = uGold;
        else if(band < -5.0)  col = mix(uGold, uGreen, 0.35);
        else if(band < 5.0)   col = uGreen;
        else if(band < 15.0)  col = mix(uGreen, uCyan, 0.5);
        else                  col = uCyan;
        col = mix(col, uCyan, 0.25);
        float wave = exp(-pow(fract(p.y*0.012 - uTime*0.05)-0.5,2.0)*60.0);
        col += uCyan * wave * 0.5;
        float dist = length(vWorld.xz - vec2(0.0, 18.0));
        float fade = smoothstep(150.0, 18.0, dist);
        float near = smoothstep(2.0, 16.0, abs(vWorld.z-18.0));
        float a = g * fade * (0.35 + 0.65*near);
        gl_FragColor = vec4(col * (0.7 + g*0.8), a);
      }`
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, FIELD_LEN, 1,1), groundMat);
  ground.rotation.x = -Math.PI/2; ground.position.z = -60;
  scene.add(ground);

  // data-stream strips between fields
  const streamGeo = new THREE.PlaneGeometry(0.5, FIELD_LEN);
  const streams = [];
  for(let i=0;i<BANDS.length+1;i++){
    const m = new THREE.MeshBasicMaterial({ color:0x00e5ff, transparent:true, opacity:0,
      blending:THREE.AdditiveBlending, depthWrite:false });
    const s = new THREE.Mesh(streamGeo, m);
    s.rotation.x = -Math.PI/2; s.position.set(-25 + i*10, 0.02, -60);
    s.userData.phase = i*0.7; streams.push(s); scene.add(s);
  }

  // ---- 2) crops: instanced glowing sprouts that scroll & recycle (seamless) ----
  const ROWS = 26, PER_ROW = 7;
  const TOTAL = BANDS.length * ROWS * PER_ROW;
  const sprout = new THREE.ConeGeometry(0.16, 0.95, 5, 1, true);
  sprout.translate(0, 0.47, 0);
  const cropMat = new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true, opacity:0.92,
    blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide });
  const crops = new THREE.InstancedMesh(sprout, cropMat, TOTAL);
  crops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const cropZ = new Float32Array(TOTAL), cropX = new Float32Array(TOTAL), cropS = new Float32Array(TOTAL);
  const dummy = new THREE.Object3D();
  let idx=0;
  for(const b of BANDS){
    for(let r=0;r<ROWS;r++) for(let k=0;k<PER_ROW;k++){
      cropX[idx] = b.x + (k-(PER_ROW-1)/2)*1.15 + (Math.random()-0.5)*0.4;
      cropZ[idx] = -(r/ROWS)*FIELD_LEN + (Math.random()-0.5)*2.2;
      cropS[idx] = 0.55 + Math.random()*0.7;                 // early-growth = small
      crops.setColorAt(idx, b.color.clone().multiplyScalar(0.8+Math.random()*0.5));
      idx++;
    }
  }
  crops.instanceColor.needsUpdate = true;
  scene.add(crops);

  // ---- 3) agro-drones: slow orbit + laser scan beam ----
  const drones = [];
  const droneGeo = new THREE.OctahedronGeometry(0.6, 0);
  const beamGeo = new THREE.ConeGeometry(0.9, 8, 12, 1, true); beamGeo.translate(0,-4,0);
  for(let i=0;i<5;i++){
    const grp = new THREE.Group();
    const body = new THREE.Mesh(droneGeo, new THREE.MeshBasicMaterial({color:0xbfeefc}));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1,0.05,8,28),
      new THREE.MeshBasicMaterial({color:0x00e5ff, transparent:true, opacity:0.9}));
    ring.rotation.x = Math.PI/2;
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color:0x23f5a6, transparent:true, opacity:0.18, blending:THREE.AdditiveBlending, depthWrite:false }));
    grp.add(body, ring, beam);
    grp.userData = { r:13+i*3.2, a:i*1.3, speed:0.12+i*0.015, h:9+(i%2)*2.5, beam };
    scene.add(grp); drones.push(grp);
  }

  // ---- 4) atmospheric data motes ----
  const MOTES=420; const mGeo=new THREE.BufferGeometry();
  const mPos=new Float32Array(MOTES*3);
  for(let i=0;i<MOTES;i++){
    mPos[i*3]=(Math.random()-0.5)*120; mPos[i*3+1]=Math.random()*26; mPos[i*3+2]=-Math.random()*FIELD_LEN;
  }
  mGeo.setAttribute('position', new THREE.BufferAttribute(mPos,3));
  const motes=new THREE.Points(mGeo, new THREE.PointsMaterial({
    color:0x9fe8ff, size:0.12, transparent:true, opacity:0.6,
    blending:THREE.AdditiveBlending, depthWrite:false }));
  scene.add(motes);

  // ---- post: neon bloom ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1), 0.85, 0.6, 0.16));

  function resize(){
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w,h,false); composer.setSize(w,h);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  const clock = new THREE.Clock();
  let scroll = 0, raf = 0, ready = false, disposed = false;

  function tick(){
    if(disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    scroll += dt*SCROLL;
    groundMat.uniforms.uTime.value = t;
    groundMat.uniforms.uScroll.value = scroll;

    // JARVIS camera: slight yaw + bob (periodic => loop-safe)
    camera.position.x = Math.sin(t*0.12)*1.6;
    camera.position.y = 7.5 + Math.sin(t*0.22)*0.5;
    camera.rotation.z = Math.sin(t*0.1)*0.012;
    camera.lookAt(Math.sin(t*0.12)*0.6, 2.5, -30);

    for(let i=0;i<TOTAL;i++){
      let z = cropZ[i] + scroll;
      z = ((z % FIELD_LEN)+FIELD_LEN)%FIELD_LEN;
      const worldZ = z - FIELD_LEN + 30;
      const sway = Math.sin(t*1.4 + cropX[i]*0.6 + i)*0.06;
      dummy.position.set(cropX[i], 0, worldZ);
      dummy.rotation.set(0,0,sway);
      const s = cropS[i];
      dummy.scale.set(s, s*(0.9+Math.sin(t*0.8+i)*0.08), s);
      dummy.updateMatrix();
      crops.setMatrixAt(i, dummy.matrix);
    }
    crops.instanceMatrix.needsUpdate = true;

    for(const s of streams) s.material.opacity = 0.10 + Math.abs(Math.sin(t*0.8 + s.userData.phase))*0.22;

    for(const d of drones){
      const u=d.userData; u.a += dt*u.speed;
      d.position.set(Math.cos(u.a)*u.r, u.h + Math.sin(u.a*2)*0.6, -40 + Math.sin(u.a)*u.r);
      d.rotation.y += dt*0.6;
      u.beam.material.opacity = 0.10 + Math.abs(Math.sin(t*3 + u.a))*0.18;
    }

    const mp = motes.geometry.attributes.position.array;
    for(let i=0;i<MOTES;i++){
      mp[i*3+2] += dt*SCROLL*0.6;
      if(mp[i*3+2] > 30){ mp[i*3+2] = -FIELD_LEN; mp[i*3]=(Math.random()-0.5)*120; }
    }
    motes.geometry.attributes.position.needsUpdate = true;

    composer.render();
    if(!ready){ ready = true; opts.onReady && opts.onReady(); }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    dispose(){
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      composer.dispose();
      renderer.dispose();
      scene.traverse(o=>{ o.geometry && o.geometry.dispose(); if(o.material){ (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose()); } });
    }
  };
}

export default mountAgroHologram;
