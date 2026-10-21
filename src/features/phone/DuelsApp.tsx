import { useCallback, useEffect, useState } from 'react';
import { BubbleRush } from '../minigames/BubbleRush';
import { MemoryPairs } from '../minigames/MemoryPairs';
import { createDuel, declineDuel, duelLeaderboard, listMyDuels, submitDuelScore, type Duel, type DuelistRow } from '../../persistence/duels';
import { isSupabaseConfigured, readableSupabaseError } from '../../persistence/supabase';
import { useSession } from '../../persistence/session';
import { routeHref } from '../../app/useHashRoute';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import type { GameId } from '../minigames/rng';
import '../minigames/minigames.css';

const gameName = (g: GameId) => (g === 'bubbles' ? tr('burbuja rápida', 'bubble rush') : tr('memoria aero', 'aero memory'));

/** modo competición: retos uno a uno con la misma partida para las dos personas; gana quien puntúa más. */
export function DuelsApp({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const [duels, setDuels] = useState<Duel[] | null>(null);
  const [board, setBoard] = useState<DuelistRow[]>([]);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [playing, setPlaying] = useState<Duel | null>(null);
  const [rival, setRival] = useState('');
  const [game, setGame] = useState<GameId>('bubbles');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [mine, top] = await Promise.all([listMyDuels(), duelLeaderboard()]);
      setDuels(mine);
      setBoard(top);
    } catch (e) {
      setDuels([]);
      setMsg({ text: readableSupabaseError(e), error: true });
    }
  }, []);
  useEffect(() => {
    if (session.status === 'con-sesion') void refresh();
  }, [session.status, refresh]);

  if (!isSupabaseConfigured || session.status !== 'con-sesion') {
    return (
      <div className="appscreen">
        <h3>{tr('duelos', 'duels')}</h3>
        <p>{tr('los duelos necesitan una cuenta: inicia sesión para retar a otros jugadores.', 'duels need an account: sign in to challenge other players.')}</p>
        <a className="vista-button vista-button--primary" href={routeHref('auth')} onClick={onClose}>{tr('crear cuenta o entrar', 'sign up or sign in')}</a>
      </div>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await createDuel(rival.trim().replace(/^@/, ''), game);
      sfx.coin();
      setRival('');
      setMsg({ text: tr('reto enviado. cuando juegues tu partida, tu rival tiene 3 días para responder.', 'challenge sent. once you play your round, your rival has 3 days to answer.') });
      await refresh();
    } catch (err) {
      sfx.error();
      setMsg({ text: readableSupabaseError(err), error: true });
    } finally {
      setBusy(false);
    }
  };

  const finish = async (score: number) => {
    if (!playing) return;
    try {
      await submitDuelScore(playing.id, score);
      sfx.levelUp();
      setMsg({ text: `${tr('tu puntaje', 'your score')}: ${score}. ${tr('el resultado aparece cuando juegue tu rival.', 'the result appears once your rival plays.')}` });
    } catch (err) {
      setMsg({ text: readableSupabaseError(err), error: true });
    }
    setPlaying(null);
    await refresh();
  };

  if (playing) {
    return (
      <div className="appscreen">
        <h3>{gameName(playing.game)} · {tr('duelo vs', 'duel vs')} @{playing.iAmChallenger ? playing.opponent : playing.challenger}</h3>
        {playing.game === 'bubbles' ? <BubbleRush seed={playing.seed} onDone={(s) => void finish(s)} /> : <MemoryPairs seed={playing.seed} onDone={(s) => void finish(s)} />}
      </div>
    );
  }

  const open = (duels ?? []).filter((d) => d.status === 'open');
  const past = (duels ?? []).filter((d) => d.status !== 'open');
  const them = (d: Duel) => (d.iAmChallenger ? d.opponent : d.challenger);
  return (
    <div className="appscreen">
      <h3>{tr('duelos', 'duels')}</h3>
      <p className="mg__hint">{tr('reta a alguien: los dos juegan la misma partida y gana quien puntúa más.', 'challenge someone: you both play the same round and the higher score wins.')}</p>
      <form className="duel__form" onSubmit={send}>
        <input required value={rival} onChange={(e) => setRival(e.target.value.toLowerCase())} placeholder={tr('usuario a retar', 'username to challenge')} aria-label={tr('usuario a retar', 'username to challenge')} />
        <select value={game} onChange={(e) => setGame(e.target.value as GameId)} aria-label={tr('juego', 'game')}>
          <option value="bubbles">{gameName('bubbles')}</option>
          <option value="memory">{gameName('memory')}</option>
        </select>
        <button className="vista-button vista-button--primary" disabled={busy}>{busy ? tr('enviando...', 'sending...') : tr('retar', 'challenge')}</button>
      </form>
      {msg && <p role={msg.error ? 'alert' : 'status'} className="mg__hint">{msg.text}</p>}
      {duels === null && <p>{tr('cargando duelos...', 'loading duels...')}</p>}
      {open.map((d) => (
        <article key={d.id} className="duel">
          <header><span>{gameName(d.game)}</span><span>@{them(d)}</span></header>
          {d.myScore === null ? (
            <div className="duel__actions">
              <button type="button" className="vista-button vista-button--primary" onClick={() => setPlaying(d)}>{tr('jugar mi partida', 'play my round')}</button>
              {!d.iAmChallenger && <button type="button" className="vista-button" onClick={() => void declineDuel(d.id).then(refresh)}>{tr('rechazar', 'decline')}</button>}
            </div>
          ) : (
            <span>{tr('ya jugaste', 'you played')} ({d.myScore}) · {tr('esperando a tu rival', 'waiting for your rival')}</span>
          )}
        </article>
      ))}
      {past.map((d) => (
        <article key={d.id} className={`duel${d.status === 'done' ? (d.won ? ' duel--win' : d.tie ? '' : ' duel--lose') : ''}`}>
          <header>
            <span>{gameName(d.game)} · @{them(d)}</span>
            <span>{d.status === 'done' ? (d.won ? tr('ganaste', 'you won') : d.tie ? tr('empate', 'tie') : tr('perdiste', 'you lost')) : d.status === 'declined' ? tr('rechazado', 'declined') : tr('caducó', 'expired')}</span>
          </header>
          {d.status === 'done' && <span>{d.myScore} - {d.theirScore}</span>}
        </article>
      ))}
      {board.length > 0 && (
        <>
          <h4>{tr('mejores duelistas', 'top duelists')}</h4>
          <ol className="mg__hint">
            {board.slice(0, 10).map((r) => <li key={r.username}>@{r.username} · {r.wins} {tr('victorias', 'wins')} · {r.losses} {tr('derrotas', 'losses')}</li>)}
          </ol>
        </>
      )}
    </div>
  );
}
