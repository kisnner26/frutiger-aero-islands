import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import { tugByTime, tugStep } from './logic';
import './minigames.css';

/** tira y afloja de burbujas: dos personas en el mismo dispositivo, una toca su mitad de abajo y la otra la de arriba. 15 segundos. */
export function TugOfWar({ onDone }: { onDone: (winner: 1 | 2 | null) => void }) {
  const [mark, setMark] = useState(0);
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState(15);
  const over = useRef(false);

  useEffect(() => {
    if (!started) return undefined;
    const t0 = performance.now();
    const timer = window.setInterval(() => setLeft(Math.max(0, 15 - (performance.now() - t0) / 1000)), 50);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (started && left <= 0 && !over.current) {
      over.current = true;
      onDone(tugByTime(mark));
    }
  }, [started, left, mark, onDone]);

  const tap = (p: 1 | 2) => {
    if (over.current) return;
    if (!started) setStarted(true);
    sfx.pop();
    const r = tugStep(mark, p);
    setMark(r.mark);
    if (r.winner) {
      over.current = true;
      onDone(r.winner);
    }
  };

  return (
    <div className="mg">
      <div className="mg__bar"><span>{started ? `${Math.ceil(left)}s` : tr('15 segundos', '15 seconds')}</span><strong>{tr('jugador 1 arriba · jugador 2 abajo', 'player 1 top · player 2 bottom')}</strong></div>
      <div className="mg__duel">
        <button type="button" className="mg__side mg__side--1" onPointerDown={() => tap(1)}>{tr('jugador 1', 'player 1')}</button>
        <div className="mg__tug" aria-hidden="true"><i style={{ left: `${50 + mark / 2}%` }} /></div>
        <button type="button" className="mg__side mg__side--2" onPointerDown={() => tap(2)}>{tr('jugador 2', 'player 2')}</button>
      </div>
      <p className="mg__hint">{tr('toca tu lado lo más rápido que puedas para empujar la marca hasta tu borde.', 'tap your side as fast as you can to push the mark to your edge.')}</p>
    </div>
  );
}

/** duelo de reflejos: quien toque primero cuando se ponga verde gana la ronda; tocar antes regala la ronda. al mejor de 5. */
export function ReflexDuel({ onDone }: { onDone: (winner: 1 | 2 | null) => void }) {
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'between'>('idle');
  const [msg, setMsg] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const arm = () => {
    setPhase('wait');
    setMsg(tr('esperen el verde...', 'wait for green...'));
    timer.current = window.setTimeout(() => {
      setPhase('go');
      setMsg(tr('¡ya!', 'now!'));
    }, 1200 + Math.random() * 2800);
  };

  const point = (winner: 1 | 2, why: string) => {
    window.clearTimeout(timer.current);
    const next: [number, number] = winner === 1 ? [score[0] + 1, score[1]] : [score[0], score[1] + 1];
    setScore(next);
    setMsg(`${why} · ${tr('punto para el jugador', 'point for player')} ${winner}`);
    if (next[0] >= 3 || next[1] >= 3) {
      onDone(next[0] > next[1] ? 1 : 2);
      return;
    }
    setPhase('between');
  };

  const tap = (p: 1 | 2) => {
    if (phase === 'idle' || phase === 'between') return arm();
    if (phase === 'wait') {
      sfx.pop();
      return point(p === 1 ? 2 : 1, tr('salió antes', 'jumped the gun'));
    }
    if (phase === 'go') {
      sfx.coin();
      point(p, tr('más rápido', 'faster'));
    }
  };

  return (
    <div className="mg">
      <div className="mg__bar"><span>{tr('al mejor de 5', 'best of 5')}</span><strong>{score[0]} - {score[1]}</strong></div>
      <div className="mg__duel">
        <button type="button" className={`mg__side mg__side--1 ${phase === 'go' ? 'is-go' : ''}`} onPointerDown={() => tap(1)}>{tr('jugador 1', 'player 1')}</button>
        <div className={`mg__tug mg__tug--text ${phase === 'go' ? 'is-go' : ''}`} role="status">{phase === 'idle' || phase === 'between' ? msg || tr('cualquiera toca para empezar', 'either player taps to start') : msg}</div>
        <button type="button" className={`mg__side mg__side--2 ${phase === 'go' ? 'is-go' : ''}`} onPointerDown={() => tap(2)}>{tr('jugador 2', 'player 2')}</button>
      </div>
    </div>
  );
}
