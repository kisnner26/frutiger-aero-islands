import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import { reflexScore } from './logic';
import './minigames.css';

const ROUNDS = 5;
type Phase = 'idle' | 'wait' | 'go' | 'early' | 'shown';

/** reflejos: espera a que la burbuja se ponga verde y toca lo más rápido que puedas. tocar antes pierde la ronda. */
export function Reflex({ onDone }: { onDone: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [last, setLast] = useState(0);
  const [total, setTotal] = useState(0);
  const goAt = useRef(0);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const arm = () => {
    setPhase('wait');
    timer.current = window.setTimeout(() => {
      goAt.current = performance.now();
      setPhase('go');
    }, 1000 + Math.random() * 2600);
  };

  const finishRound = (points: number, next: Phase = 'shown') => {
    const sum = total + points;
    setTotal(sum);
    if (round + 1 >= ROUNDS) {
      onDone(sum);
      return;
    }
    setRound(round + 1);
    setPhase(next);
  };

  const press = () => {
    if (phase === 'idle') return arm();
    if (phase === 'shown' || phase === 'early') return arm();
    if (phase === 'wait') {
      window.clearTimeout(timer.current);
      sfx.pop();
      setLast(-1);
      finishRound(0, 'early');
      return;
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - goAt.current);
      sfx.coin();
      setLast(ms);
      finishRound(reflexScore(ms));
    }
  };

  const label =
    phase === 'idle' ? tr('toca para empezar', 'tap to start')
    : phase === 'wait' ? tr('espera el verde...', 'wait for green...')
    : phase === 'go' ? tr('¡ya!', 'now!')
    : phase === 'early' ? tr('¡muy pronto! 0 puntos. toca para seguir', 'too soon! 0 points. tap to continue')
    : `${last} ms · ${tr('toca para la siguiente', 'tap for the next')}`;

  return (
    <div className="mg">
      <div className="mg__bar"><span>{tr('ronda', 'round')} {Math.min(round + 1, ROUNDS)}/{ROUNDS}</span><strong>{total}</strong></div>
      <button type="button" className={`mg__reflex is-${phase}`} onPointerDown={press} aria-live="assertive">
        <i aria-hidden="true" />
        <span>{label}</span>
      </button>
      <p className="mg__hint">{tr('mientras más rápido, más puntos. máximo 500.', 'the faster, the more points. max 500.')}</p>
    </div>
  );
}
