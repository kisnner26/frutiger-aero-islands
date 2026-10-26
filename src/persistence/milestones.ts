import type { Doc } from '../features/editor/commands';
import { tr } from '../i18n';

const KEY = 'frutiger-aero-islands:hitos';

export interface Milestone {
  id: string;
  text: string;
  reward: number;
  done: (d: Pick<Doc, 'objects' | 'stats' | 'maxLevel'>) => boolean;
}

/** hitos de la isla: pequeños logros que regalan brillos una sola vez. */
export const MILESTONES: readonly Milestone[] = [
  { id: 'pops-25', text: tr('25 burbujas reventadas', '25 bubbles popped'), reward: 30, done: (d) => d.stats.pops >= 25 },
  { id: 'pops-250', text: tr('250 burbujas reventadas', '250 bubbles popped'), reward: 120, done: (d) => d.stats.pops >= 250 },
  { id: 'combo-5', text: tr('combo x5', 'x5 combo'), reward: 40, done: (d) => d.stats.bestCombo >= 5 },
  { id: 'combo-9', text: tr('combo x9', 'x9 combo'), reward: 90, done: (d) => d.stats.bestCombo >= 9 },
  { id: 'obj-10', text: tr('10 objetos en tu isla', '10 objects on your island'), reward: 50, done: (d) => d.objects.length >= 10 },
  { id: 'obj-40', text: tr('40 objetos en tu isla', '40 objects on your island'), reward: 150, done: (d) => d.objects.length >= 40 },
  { id: 'kinds-8', text: tr('8 tipos de decoración distintos', '8 different decoration types'), reward: 100, done: (d) => new Set(d.objects.map((o) => o.assetId)).size >= 8 },
  { id: 'lvl-5', text: tr('nivel 5', 'level 5'), reward: 120, done: (d) => d.maxLevel >= 5 },
];

export function claimed(): Set<string> {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

/** hitos recién cumplidos que aún no se cobraron; los marca como cobrados. */
export function claimNew(d: Pick<Doc, 'objects' | 'stats' | 'maxLevel'>, already = claimed()): Milestone[] {
  const fresh = MILESTONES.filter((m) => !already.has(m.id) && m.done(d));
  if (fresh.length) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...already, ...fresh.map((m) => m.id)]));
    } catch {
      /* sin almacenamiento: se cobrará de nuevo en otra sesión, no se rompe nada */
    }
  }
  return fresh;
}
