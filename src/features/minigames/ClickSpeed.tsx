import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import './minigames.css';

const DURATION = 10;

/** clics aero: toca la orbe todas las veces que puedas en 10 segundos; se mueve un poco cada vez para que no sea solo aporrear. */
export function ClickSpeed({ onDone }: { onDone: (score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const [clicks, setClicks] = useState(0);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const done = useRef(false);

  useEffect(() => {
    if (!started) return undefined;
    const t0 = performance.now();
    const timer = window.setInterval(() => setLeft(Math.max(0, DURATION - (performance.now() - t0) / 1000)), 50);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (started && left <= 0 && !done.current) {
      done.current = true;
      onDone(clicks);
    }
  }, [started, left, clicks, onDone]);

  const hit = () => {
    if (!started) {
      setStarted(true);
      return;
    }
    sfx.pop();
    setClicks((c) => c + 1);
    setPos({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 });
  };

  return (
    <div className="mg">
      <div className="mg__bar"><span>{started ? `${Math.ceil(left)}s` : tr('10 segundos', '10 seconds')}</span><strong>{clicks}</strong></div>
      <div className="mg__field">
        <button type="button" className="mg__orb" style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onPointerDown={hit} aria-label={tr('orbe', 'orb')}>
          {started ? '' : tr('toca', 'tap')}
        </button>
      </div>
      <p className="mg__hint">{tr('toca la orbe sin parar. la primera pulsación empieza el tiempo.', 'tap the orb non-stop. the first tap starts the clock.')}</p>
    </div>
  );
}
