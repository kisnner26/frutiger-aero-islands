import type { CatalogItem, PlacedObject } from './island';

const HARMONY_DISTANCE = 140;
const HARMONY_CAP = 120;
const VARIETY_BONUS = 12;

/** encanto: valor base + variedad + armonía entre tipos distintos cercanos. */
export function computeCharm(objects: readonly PlacedObject[], catalog: ReadonlyMap<string, CatalogItem>): number {
  let total = 0;
  const kinds = new Set<string>();
  for (const o of objects) {
    const item = catalog.get(o.assetId);
    if (!item) continue;
    total += item.charm;
    kinds.add(o.assetId);
  }
  total += kinds.size * VARIETY_BONUS;

  let harmony = 0;
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i];
      const b = objects[j];
      if (a.assetId === b.assetId) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) <= HARMONY_DISTANCE) harmony += 2;
    }
  }
  return Math.floor(total + Math.min(harmony, HARMONY_CAP));
}

/** encanto mínimo para cada nivel (índice 0 = nivel 1). */
export const LEVEL_THRESHOLDS = [0, 40, 100, 180, 290, 430, 600, 800, 1050, 1350] as const;

export function levelFor(charm: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (charm >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function levelProgress(charm: number): { level: number; current: number; next: number | null; ratio: number } {
  const level = levelFor(charm);
  const current = LEVEL_THRESHOLDS[level - 1];
  const next = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
  const ratio = next === null ? 1 : (charm - current) / (next - current);
  return { level, current, next, ratio: Math.min(1, Math.max(0, ratio)) };
}

export const LEVEL_UP_BONUS = 40;

/** progreso hacia el siguiente nivel a partir del nivel ya alcanzado (nunca baja). */
export function progressForLevel(charm: number, level: number): { next: number | null; ratio: number } {
  const current = LEVEL_THRESHOLDS[level - 1];
  const next = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
  if (next === null) return { next: null, ratio: 1 };
  return { next, ratio: Math.min(1, Math.max(0, (charm - current) / (next - current))) };
}
