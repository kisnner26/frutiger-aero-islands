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

/** tamaños extra que se pueden comprar con brillos antes de llegar a su nivel. */
export const MAX_LAND_EXTRA = LAND_TIERS.length - 1;

/** tamaño efectivo de la isla: el que da el nivel más los que se compraron (con tope). */
export function landIndexOf(level: number, extra = 0): number {
  return Math.min(LAND_TIERS.length - 1, landTier(level) + Math.max(0, Math.floor(extra || 0)));
}

/** "nivel" equivalente al tamaño efectivo, para las funciones de geometría que piden nivel. */
export function landLevelOf(level: number, extra = 0): number {
  return Math.max(level, LAND_TIERS[landIndexOf(level, extra)].minLevel);
}

/** precio en brillos de pasar al tamaño de índice `idx` comprándolo. */
export const LAND_PRICES: readonly number[] = [0, 400, 900, 1800, 3200];
export const landPrice = (idx: number, discount = 0) => Math.round((LAND_PRICES[idx] ?? 0) * (1 - discount));

/** tamaño inicial (nivel 1). */
export const LAND_RADII: LandRadii = LAND_TIERS[0];

/** índice del tamaño de terreno que corresponde a un nivel. */
export function landTier(level: number): number {
  let tier = 0;
  for (let i = 1; i < LAND_TIERS.length; i++) if (level >= LAND_TIERS[i].minLevel) tier = i;
  return tier;
}

export function landRadii(level: number): LandRadii {
  return LAND_TIERS[landTier(level)];
}

/** nivel al que la isla crece de nuevo, o null si ya está en su tamaño máximo. */
export function nextExpansionLevel(level: number): number | null {
  return LAND_TIERS[landTier(level) + 1]?.minLevel ?? null;
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
  if (x < radius || y < radius || x > WORLD_SIZE - radius || y > WORLD_SIZE - radius) return false;
  return ellipseValue(x, y, land.rx + radius, land.ry + radius) >= 1;
}

export function validateObject(item: CatalogItem | undefined, obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>, level = 1): PlacementError | null {
  if (!item) return 'objeto-desconocido';
  if (![obj.x, obj.y, obj.scale, obj.rotation].every(Number.isFinite)) return 'no-finito';
  if (obj.scale < item.minScale - 1e-9 || obj.scale > item.maxScale + 1e-9) return 'escala-invalida';
  if (!item.orientations.includes(obj.rotation)) return 'orientacion-invalida';
  if (!Number.isInteger(obj.x) || !Number.isInteger(obj.y)) return 'fuera-de-zona';
  if (obj.x < 0 || obj.y < 0 || obj.x > WORLD_SIZE || obj.y > WORLD_SIZE) return 'fuera-de-zona';
  const r = effectiveRadius(item, obj.scale);
  const ok = item.placementZone === 'land' ? isOnLand(obj.x, obj.y, r, level) : isInWater(obj.x, obj.y, r, level);
  return ok ? null : 'fuera-de-zona';
}

/** objeto ya guardado: vale si fue válido en algún tamaño que la isla ya tuvo (un pez puesto en el mar antes de crecer sigue siendo suyo). */
export function validateSaved(item: CatalogItem | undefined, obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>, level = 1): PlacementError | null {
  let err = validateObject(item, obj, level);
  for (let t = landTier(level) - 1; err === 'fuera-de-zona' && t >= 0; t--) err = validateObject(item, obj, LAND_TIERS[t].minLevel);
  return err;
}

export function validatePlacement(
  item: CatalogItem | undefined,
  obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>,
  currentCount: number,
  level = 1,
): PlacementError | null {
  if (currentCount >= MAX_OBJECTS) return 'limite-de-objetos';
  return validateObject(item, obj, level);
}

export const ERROR_TEXT: Record<PlacementError, string> = {
  'fuera-de-zona': tr('ese lugar no sirve para este objeto', 'that spot does not work for this object'),
  'escala-invalida': tr('la escala está fuera del rango permitido', 'the scale is outside the allowed range'),
  'orientacion-invalida': tr('orientación no admitida', 'unsupported orientation'),
  'limite-de-objetos': tr('la isla ya tiene el máximo de 150 objetos', 'the island already has the maximum of 150 objects'),
  'objeto-desconocido': tr('objeto desconocido', 'unknown object'),
  'no-finito': tr('valor no válido', 'invalid value'),
};

/** acerca un punto a la zona válida más cercana (para el borde al soltar). */
export function clampToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(WORLD_SIZE, Math.max(0, Math.round(x))),
    y: Math.min(WORLD_SIZE, Math.max(0, Math.round(y))),
  };
}
