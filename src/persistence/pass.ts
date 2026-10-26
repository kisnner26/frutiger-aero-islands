import { awardSoles } from './soles';
import { levelOf, loadProgress } from '../features/royale/progress';

/**
 * pase de temporada: el rango de batalla sube los escalones; la vía gratuita siempre se puede cobrar.
 * la vía premium está lista pero cerrada hasta que exista un cobro real con comprobación en el servidor:
 * un interruptor local lo abriría cualquiera, así que `hasPremium` devuelve false a propósito.
 */
export const SEASON = { id: 'temporada-1', name: 'temporada 1: marea alta' };
export const TIERS = 20;

const KEY = `frutiger-aero-islands:pase:${SEASON.id}`;

export interface Tier { n: number; free: number; premium: number }

export const tiers: readonly Tier[] = Array.from({ length: TIERS }, (_, i) => {
  const n = i + 1;
  return { n, free: 20 + n * 5, premium: n % 5 === 0 ? 250 + n * 10 : 60 + n * 8 };
});

export const hasPremium = (): boolean => false;

type Claimed = { free: number[]; premium: number[] };

export function claimedTiers(): Claimed {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<Claimed> | null;
    const ok = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is number => Number.isInteger(x)) : []);
    return { free: ok(v?.free), premium: ok(v?.premium) };
  } catch {
    return { free: [], premium: [] };
  }
}

export const currentTier = (xp = loadProgress().xp) => Math.min(TIERS, levelOf(xp).level);

/** cobra los escalones alcanzados de una vía; devuelve los brillos entregados (llegan a la isla al abrirse). */
export function claim(track: 'free' | 'premium', tier = currentTier(), done = claimedTiers(), premium = hasPremium()): number {
  if (track === 'premium' && !premium) return 0;
  const owed = tiers.filter((t) => t.n <= tier && !done[track].includes(t.n));
  const total = owed.reduce((s, t) => s + t[track], 0);
  if (!total) return 0;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...done, [track]: [...done[track], ...owed.map((t) => t.n)] }));
  } catch {
    return 0;
  }
  return awardSoles(total, { capped: false });
}
