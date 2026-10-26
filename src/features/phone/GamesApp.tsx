import { useCallback, useState } from 'react';
import { BubbleRush } from '../minigames/BubbleRush';
import { MemoryPairs } from '../minigames/MemoryPairs';
import { Reflex } from '../minigames/Reflex';
import { ClickSpeed } from '../minigames/ClickSpeed';
import { ReflexDuel, TugOfWar } from '../minigames/Versus';
import { isVersus, solesForGame, type MiniGame } from '../minigames/logic';
import { awardSoles, DAILY_CAP, remainingToday } from '../../persistence/soles';
import { routeHref } from '../../app/useHashRoute';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import '../minigames/minigames.css';

/** soles que da cada juego según el puntaje: burbujas hasta 200, memoria hasta 50. */
export const solesFor = solesForGame;

const NAMES: Record<MiniGame, [string, string]> = {
  bubbles: ['burbuja rápida', 'bubble rush'],
  memory: ['memoria aero', 'aero memory'],
  reflex: ['reflejos', 'reflexes'],
  clicks: ['clics aero', 'aero clicks'],
  tug: ['tira y afloja', 'tug of war'],
  draw: ['duelo de reflejos', 'reflex duel'],
};

/** minijuegos del teléfono: partidas cortas para ganar soles (con tope diario). */
export function GamesApp({ onClose }: { onClose: () => void }) {
  const [game, setGame] = useState<MiniGame | null>(null);
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<{ score: number; soles: number; winner?: 1 | 2 | null } | null>(null);

  const start = (g: MiniGame) => {
    setSeed(Math.floor(Math.random() * 2_000_000_000) + 1);
    setResult(null);
    setGame(g);
  };
  const done = useCallback((score: number) => {
    const g = game as MiniGame;
    const granted = awardSoles(solesFor(g, score));
    if (granted > 0) sfx.levelUp();
    setResult({ score, soles: granted });
  }, [game]);
  const doneVersus = useCallback((winner: 1 | 2 | null) => {
    const granted = awardSoles(solesFor('tug', 0));
    if (granted > 0) sfx.levelUp();
    setResult({ score: 0, soles: granted, winner });
  }, []);

  if (game && result) {
    const capped = result.soles < solesFor(game, result.score);
    return (
      <div className="appscreen mg__result">
        <h3>{tr('partida terminada', 'game over')}</h3>
        <strong>{isVersus(game) ? (result.winner ? `${tr('gana el jugador', 'player')} ${result.winner}` : tr('empate', 'draw')) : `${result.score} ${tr('puntos', 'points')}`}</strong>
        <p>{result.soles > 0 ? `+${result.soles} ${tr('soles para tu isla', 'suns for your island')}` : tr('hoy ya llegaste al tope de soles de los minijuegos.', "you've reached today's suns cap for minigames.")}{capped && result.soles > 0 ? ` (${tr('tope diario', 'daily cap')})` : ''}</p>
        <button type="button" className="vista-button vista-button--primary" onClick={() => start(game)}>{tr('otra vez', 'play again')}</button>
        <button type="button" className="vista-button" onClick={() => { setGame(null); setResult(null); }}>{tr('volver', 'back')}</button>
      </div>
    );
  }
  if (game) {
    return (
      <div className="appscreen">
        <h3>{tr(NAMES[game][0], NAMES[game][1])}</h3>
        {game === 'bubbles' && <BubbleRush key={seed} seed={seed} onDone={done} />}
        {game === 'memory' && <MemoryPairs key={seed} seed={seed} onDone={done} />}
        {game === 'reflex' && <Reflex key={seed} onDone={done} />}
        {game === 'clicks' && <ClickSpeed key={seed} onDone={done} />}
        {game === 'tug' && <TugOfWar key={seed} onDone={doneVersus} />}
        {game === 'draw' && <ReflexDuel key={seed} onDone={doneVersus} />}
      </div>
    );
  }
  return (
    <div className="appscreen">
      <h3>{tr('juegos', 'games')}</h3>
      <p className="mg__hint">{tr(`gana soles para tu isla. hoy puedes ganar ${remainingToday()} más (tope ${DAILY_CAP}).`, `earn suns for your island. today you can earn ${remainingToday()} more (cap ${DAILY_CAP}).`)}</p>
      <div className="mg__menu">
        <button type="button" onClick={() => start('bubbles')}><b>{tr('burbuja rápida', 'bubble rush')}</b><small>{tr('20 segundos · revienta burbujas', '20 seconds · pop bubbles')}</small></button>
        <button type="button" onClick={() => start('memory')}><b>{tr('memoria aero', 'aero memory')}</b><small>{tr('encuentra las 8 parejas', 'find the 8 pairs')}</small></button>
        <button type="button" onClick={() => start('reflex')}><b>{tr('reflejos', 'reflexes')}</b><small>{tr('5 rondas · toca cuando se ponga verde', '5 rounds · tap when it turns green')}</small></button>
        <button type="button" onClick={() => start('clicks')}><b>{tr('clics aero', 'aero clicks')}</b><small>{tr('10 segundos · cuántos clics logras', '10 seconds · how many clicks can you land')}</small></button>
        <button type="button" onClick={() => start('draw')}><b>{tr('duelo de reflejos · 2 jugadores', 'reflex duel · 2 players')}</b><small>{tr('en el mismo dispositivo · al mejor de 5', 'on the same device · best of 5')}</small></button>
        <button type="button" onClick={() => start('tug')}><b>{tr('tira y afloja · 2 jugadores', 'tug of war · 2 players')}</b><small>{tr('en el mismo dispositivo · toca más rápido que tu rival', 'on the same device · tap faster than your rival')}</small></button>
        <a href="#/arena" onClick={onClose}><b>aero arena</b><small>{tr('paintball, royale y blob en un solo lugar', 'paintball, royale and blob in one place')}</small></a>
        <a href="#/blob" onClick={onClose}><b>aero blob</b><small>{tr('come, crece y usa poderes', 'eat, grow and use powers')}</small></a>
        <a href="#/royale" onClick={onClose}><b>aero royale</b><small>{tr('batalla de 12 orbes de cristal', 'battle of 12 glass orbs')}</small></a>
        <a href={routeHref('arcade')} onClick={onClose}><b>{tr('arcade completo', 'full arcade')}</b><small>aqua racer · crystal drop · {tr('pez fuera del agua', 'fish out of water')}</small></a>
      </div>
    </div>
  );
}
