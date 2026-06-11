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
          'radial-gradient(1200px 700px at 50% 18%, rgba(10,132,255,0.18), transparent 60%),' +
          'radial-gradient(900px 600px at 80% 90%, rgba(35,245,166,0.10), transparent 60%),' +
          'radial-gradient(900px 600px at 15% 85%, rgba(255,195,77,0.08), transparent 60%),' +
          '#03070D',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {/* readability veil so foreground UI never competes with the scene */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(140% 100% at 50% 0%, transparent 38%, rgba(3,7,13,0.55) 100%),' +
            'linear-gradient(180deg, rgba(3,7,13,0.35) 0%, transparent 22%, transparent 60%, rgba(3,7,13,0.72) 100%)',
        }}
      />
    </div>
  );
}
