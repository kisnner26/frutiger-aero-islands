/** reglas puras de los minijuegos nuevos (sin pantalla, para poder probarlas). */

export type MiniGame = 'bubbles' | 'memory' | 'reflex' | 'clicks' | 'tug' | 'draw';
export const VERSUS: readonly MiniGame[] = ['tug', 'draw'];
export const isVersus = (g: MiniGame) => VERSUS.includes(g);

/** reflejos: 0 a 100 puntos por ronda según el tiempo de reacción (200 ms o menos casi llena). */
export function reflexScore(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.max(0, Math.min(100, Math.round((600 - ms) / 4)));
}

/** soles que da cada juego según el puntaje; los de dos personas dan un premio fijo pequeño. */
export function solesForGame(game: MiniGame, score: number): number {
  switch (game) {
    case 'bubbles': return score * 2;
    case 'memory': return Math.floor(score / 20);
    case 'reflex': return Math.floor(score / 8);
    case 'clicks': return Math.min(60, Math.floor(score / 3));
    default: return 5;
  }
}

/** tira y afloja: la marca va de -100 (gana 1) a 100 (gana 2); cada toque empuja hacia el lado de quien toca. */
export function tugStep(mark: number, player: 1 | 2, push = 4): { mark: number; winner: 1 | 2 | null } {
  const next = Math.max(-100, Math.min(100, mark + (player === 1 ? -push : push)));
  return { mark: next, winner: next <= -100 ? 1 : next >= 100 ? 2 : null };
}

/** si se acaba el tiempo gana quien tenga la marca de su lado; empate = null. */
export function tugByTime(mark: number): 1 | 2 | null {
  return mark < 0 ? 1 : mark > 0 ? 2 : null;
}
