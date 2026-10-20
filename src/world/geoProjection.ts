import { findCountry } from './countries';

/** proyección azimutal de áreas iguales de lambert centrada en el atlántico: todo el planeta cabe en un disco. */
const LAT0 = (22 * Math.PI) / 180;
const LON0 = (-25 * Math.PI) / 180;
export const MAP_RADIUS = 820;
/** separación mínima entre centros de islas: elipse que sigue la forma de cada isla (ancha y baja). */
export const ISLAND_SPACING = { x: 250, y: 150 } as const;

/** separación normalizada: >= 1 significa que no se solapan. */
export function islandGap(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot((a.x - b.x) / ISLAND_SPACING.x, (a.y - b.y) / ISLAND_SPACING.y);
}
/** radio máximo donde se permite colocar una isla dentro de la cuenca. */
export const PLACEMENT_LIMIT = 860;

export function projectLonLat(lon: number, lat: number): { x: number; y: number } {
  const phi = (lat * Math.PI) / 180;
  const dl = (lon * Math.PI) / 180 - LON0;
  const denom = 1 + Math.sin(LAT0) * Math.sin(phi) + Math.cos(LAT0) * Math.cos(phi) * Math.cos(dl);
  const k = Math.sqrt(2 / Math.max(denom, 1e-9));
  const x = k * Math.cos(phi) * Math.sin(dl);
  const y = -k * (Math.cos(LAT0) * Math.sin(phi) - Math.sin(LAT0) * Math.cos(phi) * Math.cos(dl));
  const s = MAP_RADIUS / 2;
  return { x: x * s, y: y * s };
}

/** inversa de la proyección: de un punto de la cuenca a longitud y latitud (grados). */
export function unprojectXY(x: number, y: number): { lon: number; lat: number } {
  const s = MAP_RADIUS / 2;
  const px = x / s;
  const py = -y / s; // hacia el norte
  const rho = Math.hypot(px, py);
  if (rho < 1e-9) return { lon: (LON0 * 180) / Math.PI, lat: (LAT0 * 180) / Math.PI };
  const c = 2 * Math.asin(Math.min(1, rho / 2));
  const lat = Math.asin(Math.max(-1, Math.min(1, Math.cos(c) * Math.sin(LAT0) + (py * Math.sin(c) * Math.cos(LAT0)) / rho)));
  const lon = LON0 + Math.atan2(px * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - py * Math.sin(LAT0) * Math.sin(c));
  let deg = (lon * 180) / Math.PI;
  while (deg > 180) deg -= 360;
  while (deg < -180) deg += 360;
  return { lon: deg, lat: (lat * 180) / Math.PI };
}

/** punto de referencia de un país en la cuenca; sin país, el centro del mar abierto. */
export function countryAnchor(code: string | null | undefined): { x: number; y: number } {
  const c = findCountry(code);
  return c ? projectLonLat(c.lon, c.lat) : { x: 0, y: 60 };
}

export interface PlacementInput {
  id: string;
  country: string | null;
  /** orden estable de llegada (fecha de creación o índice); decide quién ocupa el centro de la zona. */
  order: number;
  /** las entradas con prioridad menor se colocan antes y conservan el punto de referencia de su país. */
  priority?: number;
}

const GOLDEN = 2.399963229728653;

/**
 * reparte las islas por zonas de país de forma determinista: la primera de cada país queda en su punto de
 * referencia y las siguientes en espiral, evitando solaparse con cualquier isla ya colocada.
 */
export function placeIslands(entries: readonly PlacementInput[]): Map<string, { x: number; y: number }> {
  const placed = new Map<string, { x: number; y: number }>();
  const sorted = [...entries].sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1) || (a.country ?? '~').localeCompare(b.country ?? '~') || a.order - b.order || a.id.localeCompare(b.id));
  const slots = new Map<string, number>();
  const taken: Array<{ x: number; y: number }> = [];
  for (const e of sorted) {
    const key = e.country ?? '~';
    const anchor = countryAnchor(e.country);
    let slot = slots.get(key) ?? 0;
    const free = (p: { x: number; y: number }) => Math.hypot(p.x, p.y) <= PLACEMENT_LIMIT && taken.every((t) => islandGap(t, p) >= 1);
    let pos: { x: number; y: number } | null = null;
    for (let tries = 0; tries < 400 && !pos; tries++, slot++) {
      const r = slot === 0 ? 0 : ISLAND_SPACING.x * 0.6 * Math.sqrt(slot);
      const a = slot * GOLDEN;
      const cand = { x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r * 0.6 };
      if (free(cand)) pos = cand;
    }
    if (!pos) {
      // la zona está llena: buscar el hueco libre más cercano al punto de referencia en todo el disco
      let best: { x: number; y: number } | null = null;
      let bestD = Infinity;
      for (let r = 0; r <= PLACEMENT_LIMIT; r += 50) {
        for (let k = 0; k < Math.max(1, Math.round((2 * Math.PI * r) / 50)); k++) {
          const ang = (k / Math.max(1, Math.round((2 * Math.PI * r) / 50))) * Math.PI * 2;
          const cand = { x: Math.cos(ang) * r, y: Math.sin(ang) * r };
          const d = Math.hypot(cand.x - anchor.x, cand.y - anchor.y);
          if (d < bestD && free(cand)) {
            best = cand;
            bestD = d;
          }
        }
      }
      // sin hueco (disco saturado): se acepta el solape antes que perder la isla; véase docs/WORLD_COUNTRIES.md
      pos = best ?? { x: Math.max(-PLACEMENT_LIMIT, Math.min(PLACEMENT_LIMIT, anchor.x)), y: Math.max(-PLACEMENT_LIMIT, Math.min(PLACEMENT_LIMIT, anchor.y)) };
    }
    slots.set(key, slot + 1);
    taken.push(pos);
    placed.set(e.id, pos);
  }
  return placed;
}
