import { MAX_OBJECTS, WORLD_SIZE, type CatalogItem, type PlacedObject } from './island';

export const CENTER = { x: 500, y: 500 } as const;
export const LAND_RADII = { rx: 360, ry: 280 } as const;

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
export function isOnLand(x: number, y: number, radius: number): boolean {
  const rx = LAND_RADII.rx - radius;
  const ry = LAND_RADII.ry - radius;
  if (rx <= 0 || ry <= 0) return false;
  return ellipseValue(x, y, rx, ry) <= 1;
}

/** agua: fuera de la elipse ampliada por el radio y dentro del mundo menos el radio. */
export function isInWater(x: number, y: number, radius: number): boolean {
  if (x < radius || y < radius || x > WORLD_SIZE - radius || y > WORLD_SIZE - radius) return false;
  return ellipseValue(x, y, LAND_RADII.rx + radius, LAND_RADII.ry + radius) >= 1;
}

export function validateObject(item: CatalogItem | undefined, obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>): PlacementError | null {
  if (!item) return 'objeto-desconocido';
  if (![obj.x, obj.y, obj.scale, obj.rotation].every(Number.isFinite)) return 'no-finito';
  if (obj.scale < item.minScale - 1e-9 || obj.scale > item.maxScale + 1e-9) return 'escala-invalida';
  if (!item.orientations.includes(obj.rotation)) return 'orientacion-invalida';
  if (!Number.isInteger(obj.x) || !Number.isInteger(obj.y)) return 'fuera-de-zona';
  if (obj.x < 0 || obj.y < 0 || obj.x > WORLD_SIZE || obj.y > WORLD_SIZE) return 'fuera-de-zona';
  const r = effectiveRadius(item, obj.scale);
  const ok = item.placementZone === 'land' ? isOnLand(obj.x, obj.y, r) : isInWater(obj.x, obj.y, r);
  return ok ? null : 'fuera-de-zona';
}

export function validatePlacement(
  item: CatalogItem | undefined,
  obj: Pick<PlacedObject, 'x' | 'y' | 'scale' | 'rotation'>,
  currentCount: number,
): PlacementError | null {
  if (currentCount >= MAX_OBJECTS) return 'limite-de-objetos';
  return validateObject(item, obj);
}

export const ERROR_TEXT: Record<PlacementError, string> = {
  'fuera-de-zona': 'ese lugar no sirve para este objeto',
  'escala-invalida': 'la escala está fuera del rango permitido',
  'orientacion-invalida': 'orientación no admitida',
  'limite-de-objetos': 'la isla ya tiene el máximo de 150 objetos',
  'objeto-desconocido': 'objeto desconocido',
  'no-finito': 'valor no válido',
};

/** acerca un punto a la zona válida más cercana (para el borde al soltar). */
export function clampToWorld(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(WORLD_SIZE, Math.max(0, Math.round(x))),
    y: Math.min(WORLD_SIZE, Math.max(0, Math.round(y))),
  };
}
