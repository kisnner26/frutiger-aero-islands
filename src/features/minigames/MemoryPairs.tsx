import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../i18n';
import { sfx } from '../../audio/sfx';
import { mulberry32 } from './rng';
import './minigames.css';

const GLYPHS = ['◒', '◆', '☀', '♥', '★', '☁', '✿', '♪'];

/** el reparto de cartas sale de la semilla, igual para las dos personas de un duelo. */
export function memoryDeck(seed: number): string[] {
  const rnd = mulberry32(seed);
  const deck = [...GLYPHS, ...GLYPHS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const memoryScore = (moves: number, seconds: number) => Math.max(0, Math.min(1000, 1000 - moves * 30 - Math.round(seconds) * 8));

/** memoria aero: encuentra las ocho parejas con los menos intentos y el menor tiempo. */
export function MemoryPairs({ seed, onDone }: { seed: number; onDone: (score: number) => void }) {
  const deck = useMemo(() => memoryDeck(seed), [seed]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<ReadonlySet<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!started || found.size === deck.length) return;
    const timer = window.setInterval(() => setElapsed((performance.now() - t0.current) / 1000), 250);
    return () => window.clearInterval(timer);
  }, [started, found.size, deck.length]);

  useEffect(() => {
    if (found.size !== deck.length || done.current) return;
    done.current = true;
    onDone(memoryScore(moves, (performance.now() - t0.current) / 1000));
  }, [found.size, deck.length, moves, onDone]);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || found.has(i)) return;
    if (!started) {
      t0.current = performance.now();
      setStarted(true);
    }
    sfx.click();
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a] === deck[b]) {
        window.setTimeout(() => {
          sfx.coin();
          setFound((f) => new Set(f).add(a).add(b));
          setOpen([]);
        }, 350);
      } else {
        window.setTimeout(() => setOpen([]), 750);
      }
    }
  };

  return (
    <div className="mg">
      <div className="mg__bar"><span>{tr('intentos', 'moves')} {moves}</span><span>{Math.round(elapsed)}s</span></div>
      <p className="mg__hint">{tr('encuentra las 8 parejas. menos intentos y menos tiempo, más puntos.', 'find the 8 pairs. fewer moves and less time means more points.')}</p>
      <div className="mg__cards">
        {deck.map((glyph, i) => {
          const shown = open.includes(i) || found.has(i);
          return (
            <button key={i} type="button" className={`mg__card${shown ? ' is-up' : ''}${found.has(i) ? ' is-found' : ''}`} aria-label={shown ? glyph : tr('carta', 'card')} onClick={() => flip(i)}>
              {shown ? glyph : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
