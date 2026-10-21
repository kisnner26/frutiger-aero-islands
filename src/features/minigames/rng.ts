/** generador determinista: la misma semilla produce siempre la misma partida (necesario para los duelos). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GameId = 'bubbles' | 'memory';
export const GAME_MAX: Record<GameId, number> = { bubbles: 100, memory: 1000 };
