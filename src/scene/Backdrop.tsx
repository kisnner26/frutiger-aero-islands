import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { glassBubble } from '../art/aero';
import { renderBackdrop, renderIslandComposite } from '../art/scenery';
import { tr } from '../i18n';

/** cielo y mar dibujados a lápiz; se regeneran al cambiar el tamaño de la ventana. */
export function Backdrop({ withIsland = true }: { withIsland?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let timer = 0;
    const paint = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const art = renderBackdrop(w, h, dpr);
      canvas.width = art.width;
      canvas.height = art.height;
      canvas.getContext('2d')!.drawImage(art, 0, 0);
    };
    paint();
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="scene" aria-hidden={withIsland ? undefined : true}>
      <canvas ref={ref} className="scene__paper" aria-hidden="true" />
      {withIsland && <IslandArt />}
      {withIsland && <FloatingBubbles />}
    </div>
  );
}

function IslandArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    renderIslandComposite()
      .then((art) => {
        const canvas = ref.current;
        if (cancelled || !canvas) return;
        canvas.width = art.width;
        canvas.height = art.height;
        canvas.getContext('2d')!.drawImage(art, 0, 0);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);
  if (failed) return null;
  return <canvas ref={ref} className="scene__island" role="img" aria-label={tr('dibujo a lápiz de una isla con palmeras, un pabellón de vidrio, una fuente y cristales', 'pencil drawing of an island with palm trees, a glass pavilion, a fountain and crystals')} />;
}

const BUBBLES: Array<{ x: string; y: string; s: string; d: string; seed: number }> = [
  { x: '58%', y: '8%', s: 'min(24vw, 190px)', d: '9s', seed: 3 },
  { x: '88%', y: '44%', s: 'min(14vw, 110px)', d: '12s', seed: 5 },
  { x: '8%', y: '62%', s: 'min(18vw, 130px)', d: '10s', seed: 7 },
];

function FloatingBubbles() {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    setUrls(BUBBLES.map((b) => glassBubble(256, { seed: b.seed }).toDataURL()));
  }, []);
  return (
    <>
      {urls.map((u, i) => (
        <img key={i} className="scene__bubble" src={u} alt="" aria-hidden="true" style={{ '--x': BUBBLES[i].x, '--y': BUBBLES[i].y, '--s': BUBBLES[i].s, '--d': BUBBLES[i].d } as CSSProperties} />
      ))}
    </>
  );
}
