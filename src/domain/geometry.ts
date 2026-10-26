import { MAX_OBJECTS, WORLD_SIZE, type CatalogItem, type PlacedObject } from './island';
import { tr } from '../i18n';

export const CENTER = { x: 500, y: 500 } as const;

export interface LandRadii {
  readonly rx: number;
  readonly ry: number;
}

/** tamaños del terreno: la isla solo crece. cada uno se alcanza al llegar a su nivel. */
export const LAND_TIERS: readonly (LandRadii & { readonly minLevel: number })[] = [
  { rx: 360, ry: 280, minLevel: 1 },
  { rx: 400, ry: 310, minLevel: 4 },
  { rx: 440, ry: 340, minLevel: 7 },
  { rx: 456, ry: 352, minLevel: 10 },
  { rx: 470, ry: 372, minLevel: 14 },
];

/** a partir del último tamaño por nivel, cada tamaño comprado suma esto a los radios. */
const GROW_PER_STEP = 100;
/** los "niveles" sintéticos de los tamaños comprados empiezan aquí (muy por encima de cualquier nivel real). */
const SYNTH = 1000;
/** tope técnico de tamaños comprados; con el precio exponencial nadie llega antes de quedarse sin brillos. */
export const MAX_LAND_INDEX = 400;

/** radios del tamaño de índice `i` (sin tope: crece en línea recta pasado el último tamaño por nivel). */
export function radiiOfIndex(i: number): LandRadii {
  const last = LAND_TIERS.length - 1;
  if (i <= last) return LAND_TIERS[Math.max(0, i)];
  const rx = LAND_TIERS[last].rx + GROW_PER_STEP * (i - last);
  return { rx, ry: Math.round(rx * (LAND_TIERS[last].ry / LAND_TIERS[last].rx)) };
}

/** tamaño efectivo de la isla: el que da el nivel más los que se compraron. */
export function landIndexOf(level: number, extra = 0): number {
  return Math.min(MAX_LAND_INDEX, landTier(level) + Math.max(0, Math.floor(extra || 0)));
}

/** "nivel" equivalente al tamaño efectivo, para las funciones de geometría que piden nivel. */
export function landLevelOf(level: number, extra = 0): number {
  const idx = landIndexOf(level, extra);
  return idx < LAND_TIERS.length ? Math.max(level, LAND_TIERS[idx].minLevel) : SYNTH + idx;
}

/** nivel sintético (o real) que corresponde a un índice de tamaño, para recorrer tamaños anteriores. */
export const levelOfIndex = (idx: number) => (idx < LAND_TIERS.length ? LAND_TIERS[idx].minLevel : SYNTH + idx);

/** precio en brillos de pasar al tamaño de índice `idx` comprándolo: sube un 45% cada vez, sin techo. */
const BASE_PRICES: readonly number[] = [0, 400, 900, 1800, 3200];
export function landPrice(idx: number, discount = 0): number {
  const base = idx < BASE_PRICES.length ? BASE_PRICES[idx] : BASE_PRICES[BASE_PRICES.length - 1] * Math.pow(1.45, idx - (BASE_PRICES.length - 1));
  return Math.round(base * (1 - discount));
}

/** objetos permitidos: más terreno, más lugar para decorar. */
export function maxObjectsFor(level: number): number {
  const extra = Math.max(0, landTier(level) - (LAND_TIERS.length - 1));
  return Math.min(1000, MAX_OBJECTS + 25 * extra);
}

/** límite técnico de coordenadas (con la isla centrada en `CENTER`); permite islas enormes. */
export const COORD_LIMIT = 50_000;

/** tamaño inicial (nivel 1). */
export const LAND_RADII: LandRadii = LAND_TIERS[0];

/** índice del tamaño de terreno que corresponde a un nivel (o a un nivel sintético de tamaño comprado). */
export function landTier(level: number): number {
  if (level >= SYNTH) return Math.min(MAX_LAND_INDEX, level - SYNTH);
  let tier = 0;
  for (let i = 1; i < LAND_TIERS.length; i++) if (level >= LAND_TIERS[i].minLevel) tier = i;
  return tier;
}

export function landRadii(level: number): LandRadii {
  return radiiOfIndex(landTier(level));
}

/** nivel al que la isla crece de nuevo por sí sola, o null cuando ya pasó los tamaños por nivel. */
export function nextExpansionLevel(level: number): number | null {
  return level >= SYNTH ? null : LAND_TIERS[landTier(level) + 1]?.minLevel ?? null;
}

export type PlacementError =
  | 'fuera-de-zona'
  | 'escala-invalida'
  | 'orientacion-invalida'
  | 'limite-de-objetos'
  | 'objeto-desconocido'
  | 'no-finito';

export function ellipseValue(x: number, y: number, rx: number, ry: number): number {
  const dx = (x - CENTER.x) / rx;
  const dy = (y - CENTER.y) / ry;
  return dx * dx + dy * dy;
}

export function effectiveRadius(item: CatalogItem, scale: number): number {
  return item.footprintRadius * scale;
}

/** tierra: el disco de apoyo cabe dentro de la elipse reducida por el radio. */
export function isOnLand(x: number, y: number, radius: number, level = 1): boolean {
  const land = landRadii(level);
  const rx = land.rx - radius;
  const ry = land.ry - radius;
  if (rx <= 0 || ry <= 0) return false;
  return ellipseValue(x, y, rx, ry) <= 1;
}

/** agua: fuera de la elipse ampliada por el radio y dentro del mundo menos el radio. */
export function isInWater(x: number, y: number, radius: number, level = 1): boolean {
  const land = landRadii(level);
  if (x < -COORD_LIMIT + radius || y < -COORD_LIMIT + radius || x > COORD_LIMIT + WORLD_SIZE - radius || y > COORD_LIMIT + WORLD_SIZE - radius) return false;
  return ellipseValue(x, y, land.rx + radius, land.ry + radius) >= 1;
}

export function validateObject(item: CatalogItem | undefined, obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>, level = 1): PlacementError | null {
  if (!item) return 'objeto-desconocido';
  if (![obj.x, obj.y, obj.scale, obj.rotation].every(Number.isFinite)) return 'no-finito';
  if (obj.scale < item.minScale - 1e-9 || obj.scale > item.maxScale + 1e-9) return 'escala-invalida';
  if (!item.orientations.includes(obj.rotation)) return 'orientacion-invalida';
  if (!Number.isInteger(obj.x) || !Number.isInteger(obj.y)) return 'fuera-de-zona';
  if (obj.x < -COORD_LIMIT || obj.y < -COORD_LIMIT || obj.x > COORD_LIMIT + WORLD_SIZE || obj.y > COORD_LIMIT + WORLD_SIZE) return 'fuera-de-zona';
  const r = effectiveRadius(item, obj.scale);
  const ok = item.placementZone === 'land' ? isOnLand(obj.x, obj.y, r, level) : isInWater(obj.x, obj.y, r, level);
  return ok ? null : 'fuera-de-zona';
}

/** objeto ya guardado: vale si fue válido en algún tamaño que la isla ya tuvo (un pez puesto en el mar antes de crecer sigue siendo suyo). */
export function validateSaved(item: CatalogItem | undefined, obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>, level = 1): PlacementError | null {
  let err = validateObject(item, obj, level);
  for (let t = landTier(level) - 1; err === 'fuera-de-zona' && t >= 0; t--) err = validateObject(item, obj, levelOfIndex(t));
  return err;
}

export function validatePlacement(
  item: CatalogItem | undefined,
  obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>,
  currentCount: number,
  level = 1,
): PlacementError | null {
  if (currentCount >= maxObjectsFor(level)) return 'limite-de-objetos';
  return validateObject(item, obj, level);
}

export const ERROR_TEXT: Record<PlacementError, string> = {
  'fuera-de-zona': tr('ese lugar no sirve para este objeto', 'that spot does not work for this object'),
  'escala-invalida': tr('la escala está fuera del rango permitido', 'the scale is outside the allowed range'),
  'orientacion-invalida': tr('orientación no admitida', 'unsupported orientation'),
  'limite-de-objetos': tr('tu isla está llena: amplía el terreno para poner más objetos', 'your island is full: expand the land to place more objects'),
  'objeto-desconocido': tr('objeto desconocido', 'unknown object'),
  'no-finito': tr('valor no válido', 'invalid value'),
};

/** acerca un punto a la zona válida más cercana (para el borde al soltar). */
export function clampToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(COORD_LIMIT + WORLD_SIZE, Math.max(-COORD_LIMIT, Math.round(x))),
    y: Math.min(COORD_LIMIT + WORLD_SIZE, Math.max(-COORD_LIMIT, Math.round(y))),
  };
}
