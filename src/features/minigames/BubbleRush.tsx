import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../i18n';
import { sfx } from '../../audio/sfx';
import { mulberry32 } from './rng';
import './minigames.css';

const DURATION = 20;
const LIFE = 1.8;
const COUNT = 28;

interface Bubble { id: number; t: number; x: number; size: number; golden: boolean }

/** el calendario de burbujas sale solo de la semilla: en un duelo las dos personas juegan la misma partida. */
export function bubbleSchedule(seed: number): Bubble[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: COUNT }, (_, id) => ({
    id,
    t: Math.round((0.4 + (id / COUNT) * (DURATION - 2.4) + rnd() * 0.5) * 100) / 100,
    x: 8 + rnd() * 78,
    size: 46 + rnd() * 24,
    golden: rnd() < 0.14,
  }));
}

/** burbuja rápida: revienta las que suben antes de que se escapen; las doradas valen 3. */
export function BubbleRush({ seed, onDone }: { seed: number; onDone: (score: number) => void }) {
  const schedule = useMemo(() => bubbleSchedule(seed), [seed]);
  const [started, setStarted] = useState(false);
  const [now, setNow] = useState(0);
  const [popped, setPopped] = useState<ReadonlySet<number>>(new Set());
  const [score, setScore] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    const timer = window.setInterval(() => setNow((performance.now() - t0) / 1000), 50);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started || now < DURATION || finished.current) return;
    finished.current = true;
    onDone(score);
  }, [started, now, score, onDone]);

  const pop = (b: Bubble) => {
    if (popped.has(b.id)) return;
    sfx.pop();
    setPopped((p) => new Set(p).add(b.id));
    setScore((s) => s + (b.golden ? 3 : 1));
  };

  if (!started) {
    return (
      <div className="mg">
        <p className="mg__hint">{tr('revienta las burbujas antes de que se escapen. las doradas valen 3. tienes 20 segundos.', 'pop the bubbles before they escape. golden ones are worth 3. you have 20 seconds.')}</p>
        <button type="button" className="vista-button vista-button--primary" onClick={() => setStarted(true)}>{tr('empezar', 'start')}</button>
      </div>
    );
  }
  return (
    <div className="mg">
      <div className="mg__bar"><span>{tr('tiempo', 'time')} {Math.max(0, Math.ceil(DURATION - now))}s</span><strong>{score}</strong></div>
      <div className="mg__field" role="group" aria-label={tr('burbujas', 'bubbles')}>
        {schedule.filter((b) => now >= b.t && now < b.t + LIFE && !popped.has(b.id)).map((b) => (
          <button
            key={b.id}
            type="button"
            className={`mg__bubble${b.golden ? ' is-gold' : ''}`}
            aria-label={b.golden ? tr('burbuja dorada', 'golden bubble') : tr('burbuja', 'bubble')}
            style={{ left: `${b.x}%`, top: `${100 - ((now - b.t) / LIFE) * 100}%`, width: b.size, height: b.size }}
            onPointerDown={() => pop(b)}
          />
        ))}
      </div>
    </div>
  );
}
