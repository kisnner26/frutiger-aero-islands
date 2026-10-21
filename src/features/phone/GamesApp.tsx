import { useCallback, useState } from 'react';
import { BubbleRush } from '../minigames/BubbleRush';
import { MemoryPairs } from '../minigames/MemoryPairs';
import { awardSoles, DAILY_CAP, remainingToday } from '../../persistence/soles';
import { routeHref } from '../../app/useHashRoute';
import { sfx } from '../../audio/sfx';
import { tr } from '../../i18n';
import type { GameId } from '../minigames/rng';
import '../minigames/minigames.css';

/** soles que da cada juego según el puntaje: burbujas hasta 200, memoria hasta 50. */
export const solesFor = (game: GameId, score: number) => (game === 'bubbles' ? score * 2 : Math.floor(score / 20));

/** minijuegos del teléfono: partidas cortas para ganar soles (con tope diario). */
export function GamesApp({ onClose }: { onClose: () => void }) {
  const [game, setGame] = useState<GameId | null>(null);
  const [seed, setSeed] = useState(1);
  const [result, setResult] = useState<{ score: number; soles: number } | null>(null);

  const start = (g: GameId) => {
    setSeed(Math.floor(Math.random() * 2_000_000_000) + 1);
    setResult(null);
    setGame(g);
  };
  const done = useCallback((score: number) => {
    const g = game as GameId;
    const granted = awardSoles(solesFor(g, score));
    if (granted > 0) sfx.levelUp();
    setResult({ score, soles: granted });
  }, [game]);

  if (game && result) {
    const capped = result.soles < solesFor(game, result.score);
    return (
      <div className="appscreen mg__result">
        <h3>{tr('partida terminada', 'game over')}</h3>
        <strong>{result.score} {tr('puntos', 'points')}</strong>
        <p>{result.soles > 0 ? `+${result.soles} ${tr('soles para tu isla', 'suns for your island')}` : tr('hoy ya llegaste al tope de soles de los minijuegos.', "you've reached today's suns cap for minigames.")}{capped && result.soles > 0 ? ` (${tr('tope diario', 'daily cap')})` : ''}</p>
        <button type="button" className="vista-button vista-button--primary" onClick={() => start(game)}>{tr('otra vez', 'play again')}</button>
        <button type="button" className="vista-button" onClick={() => { setGame(null); setResult(null); }}>{tr('volver', 'back')}</button>
      </div>
    );
  }
  if (game) {
    return (
      <div className="appscreen">
        <h3>{game === 'bubbles' ? tr('burbuja rápida', 'bubble rush') : tr('memoria aero', 'aero memory')}</h3>
        {game === 'bubbles' ? <BubbleRush key={seed} seed={seed} onDone={done} /> : <MemoryPairs key={seed} seed={seed} onDone={done} />}
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
        <a href="#/royale" onClick={onClose}><b>aero royale</b><small>{tr('batalla de 12 orbes de cristal', 'battle of 12 glass orbs')}</small></a>
        <a href={routeHref('arcade')} onClick={onClose}><b>{tr('arcade completo', 'full arcade')}</b><small>aqua racer · crystal drop · {tr('pez fuera del agua', 'fish out of water')}</small></a>
      </div>
    </div>
  );
}
