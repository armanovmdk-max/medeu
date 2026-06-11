import { useEffect, useRef } from 'react';
import { mountAgroHologram } from './scene.js';

/**
 * AgroAssist AI — holographic field background.
 *
 * Renders the animated WebGL scene as a fixed, full-viewport background layer.
 * Requires `three` as a dependency:  npm i three
 *
 * Place your page content in a sibling element with a higher z-index, e.g.
 *   <AgroHologramBackground />
 *   <main style={{ position:'relative', zIndex:4 }}>…</main>
 *
 * The floating HUD panels / crop tags from index.html are plain DOM — copy that
 * markup into your layout if you want them; this component owns only the canvas
 * + readability veil.
 */
export default function AgroHologramBackground({ className, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let handle;
    try {
      handle = mountAgroHologram(canvasRef.current);
    } catch (e) {
      // WebGL unavailable — the CSS gradient fallback below stays visible.
      console.error('[AgroHologramBackground] WebGL init failed:', e);
    }
    return () => handle && handle.dispose();
  }, []);

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        background:
          'radial-gradient(1100px 640px at 50% 12%, rgba(20,136,216,0.10), transparent 62%),' +
          'radial-gradient(820px 560px at 82% 88%, rgba(22,166,107,0.08), transparent 60%),' +
          'radial-gradient(760px 520px at 14% 86%, rgba(217,149,43,0.07), transparent 60%),' +
          '#F5F9FC',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {/* light vignette: whitens edges so foreground UI never competes with the scene */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(125% 95% at 50% 6%, rgba(245,249,252,0) 42%, rgba(245,249,252,0.62) 100%),' +
            'linear-gradient(180deg, rgba(245,249,252,0.55) 0%, transparent 16%, transparent 66%, rgba(245,249,252,0.9) 100%)',
        }}
      />
    </div>
  );
}
