import { awardSoles } from './soles';
import { cosmetics } from './cosmetics';
import { loadProgress } from '../features/royale/progress';
import { tr } from '../i18n';

/**
 * pase de temporada con dos vías: gratuita y aero (de pago).
 * la experiencia sale de jugar (burbujas, decorar, batallas) y cada escalón desbloquea un premio en cada vía.
 * la vía aero está lista pero cerrada: cobrar de verdad exige un proveedor de pagos y un permiso guardado en el
 * servidor. un interruptor local lo abriría cualquiera, así que `hasPremium` solo se abre en desarrollo.
 */
export const SEASON = { id: 'temporada-1', name: tr('temporada 1: marea alta', 'season 1: high tide') };
export const TIERS = 25;
export const XP_PER_TIER = 120;

const KEY = `frutiger-aero-islands:pase:${SEASON.id}`;
const XP_KEY = `${KEY}:xp`;
const DEV_KEY = 'fai:dev-aero';

export type Reward = { kind: 'brillos'; n: number } | { kind: 'paleta'; id: string } | { kind: 'titulo'; id: string };
export interface Tier { n: number; free: Reward; aero: Reward }

const b = (n: number): Reward => ({ kind: 'brillos', n });
const pal = (id: string): Reward => ({ kind: 'paleta', id });
const tit = (id: string): Reward => ({ kind: 'titulo', id });

/** premios especiales; el resto de escalones da brillos que crecen con el escalón. */
const FREE_SPECIAL: Record<number, Reward> = { 5: pal('coral'), 10: tit('marinero'), 15: pal('menta'), 20: tit('jardinero'), 25: pal('atardecer') };
const AERO_SPECIAL: Record<number, Reward> = {
  1: pal('cristal'), 3: tit('capitan'), 5: pal('aurora'), 8: tit('viajero'), 10: pal('oro'), 15: b(900), 20: b(1500), 25: tit('leyenda'),
};

export const tiers: readonly Tier[] = Array.from({ length: TIERS }, (_, i) => {
  const n = i + 1;
  return { n, free: FREE_SPECIAL[n] ?? b(20 + n * 4), aero: AERO_SPECIAL[n] ?? b(60 + n * 14) };
});

let testerMode = false;
/** lo activa el editor para las cuentas de prueba (ver tester.ts). */
export const setTesterMode = (on: boolean) => {
  testerMode = on;
};

export const hasPremium = (): boolean => {
  if (testerMode) return true;
  try {
    return Boolean(import.meta.env.DEV) && window.localStorage.getItem(DEV_KEY) === '1';
  } catch {
    return false;
  }
};

/** ventajas de la vía aero que el juego aplica en el momento. */
export function perks(premium = hasPremium()): { popBonus: number; landDiscount: number } {
  return premium ? { popBonus: 0.2, landDiscount: 0.25 } : { popBonus: 0, landDiscount: 0 };
}

type Track = 'free' | 'aero';
type Claimed = Record<Track, number[]>;

export function claimedTiers(): Claimed {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as Partial<Claimed> | null;
    const ok = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is number => Number.isInteger(x)) : []);
    return { free: ok(v?.free), aero: ok(v?.aero) };
  } catch {
    return { free: [], aero: [] };
  }
}

const xpListeners = new Set<() => void>();
export const subscribePassXp = (l: () => void) => {
  xpListeners.add(l);
  return () => xpListeners.delete(l);
};

function localXp(): number {
  try {
    return Math.max(0, Math.floor(Number(window.localStorage.getItem(XP_KEY)) || 0));
  } catch {
    return 0;
  }
}

/** suma experiencia del pase por jugar en la isla. */
export function addPassXp(n: number) {
  const add = Math.max(0, Math.floor(n));
  if (!add) return;
  try {
    window.localStorage.setItem(XP_KEY, String(localXp() + add));
  } catch {
    return;
  }
  xpListeners.forEach((l) => l());
}

export const totalXp = () => localXp() + Math.floor(loadProgress().xp / 2);

export function passLevel(xp = totalXp()): { tier: number; into: number; need: number } {
  const tier = Math.min(TIERS, Math.floor(xp / XP_PER_TIER));
  return { tier, into: tier >= TIERS ? XP_PER_TIER : xp - tier * XP_PER_TIER, need: XP_PER_TIER };
}

export function describeReward(r: Reward): string {
  if (r.kind === 'brillos') return `+${r.n}`;
  if (r.kind === 'paleta') return `${tr('suelo', 'ground')} ${r.id}`;
  return r.id;
}

function give(r: Reward): number {
  if (r.kind === 'brillos') return awardSoles(r.n, { capped: false });
  cosmetics.grant(r.kind === 'paleta' ? 'paleta' : 'titulo', r.id);
  return 0;
}

/** cobra los escalones alcanzados de una vía; devuelve cuántos cobró. los brillos llegan a la isla al abrirse. */
export function claim(track: Track, tier = passLevel().tier, done = claimedTiers(), premium = hasPremium()): number {
  if (track === 'aero' && !premium) return 0;
  const owed = tiers.filter((t) => t.n <= tier && !done[track].includes(t.n));
  if (!owed.length) return 0;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...done, [track]: [...done[track], ...owed.map((t) => t.n)] }));
  } catch {
    return 0;
  }
  owed.forEach((t) => give(t[track]));
  return owed.length;
}
