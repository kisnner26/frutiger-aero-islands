import { CENTER, isOnLand, landRadii } from '../../domain/geometry';
import type { CatalogItem, PlacedObject } from '../../domain/island';

export interface Walker {
  x: number;
  y: number;
  /** 0 mira al norte (−y); crece en sentido horario. */
  heading: number;
}

export interface WalkInput {
  forward: number;
  strafe: number;
  turn: number;
}

export const WALK_SPEED = 150;
export const TURN_SPEED = 2.1;
export const BODY_RADIUS = 12;

export const dirOf = (heading: number) => ({ x: Math.sin(heading), y: -Math.cos(heading) });
export const rightOf = (heading: number) => ({ x: Math.cos(heading), y: Math.sin(heading) });

/** ¿se puede estar de pie en (x, y)? tierra de la isla y sin atravesar objetos de tierra. */
export function canStand(x: number, y: number, objects: readonly PlacedObject[], catalog: ReadonlyMap<string, CatalogItem>, level: number): boolean {
  if (!isOnLand(x, y, BODY_RADIUS, level)) return false;
  for (const o of objects) {
    const item = catalog.get(o.assetId);
    if (!item || item.placementZone !== 'land') continue;
    if (Math.hypot(x - o.x, y - o.y) < item.footprintRadius * o.scale * 0.72 + BODY_RADIUS * 0.8) return false;
  }
  return true;
}

export function stepWalker(w: Walker, input: WalkInput, dt: number, objects: readonly PlacedObject[], catalog: ReadonlyMap<string, CatalogItem>, level: number): Walker {
  const heading = w.heading + input.turn * TURN_SPEED * dt;
  const d = dirOf(heading);
  const r = rightOf(heading);
  const len = Math.hypot(input.forward, input.strafe) || 1;
  const k = Math.min(1, len) / len;
  const vx = (d.x * input.forward + r.x * input.strafe) * k * WALK_SPEED * dt;
  const vy = (d.y * input.forward + r.y * input.strafe) * k * WALK_SPEED * dt;
  let { x, y } = w;
  if (canStand(x + vx, y + vy, objects, catalog, level)) {
    x += vx;
    y += vy;
  } else if (canStand(x + vx, y, objects, catalog, level)) x += vx; // desliza por el borde
  else if (canStand(x, y + vy, objects, catalog, level)) y += vy;
  return { x, y, heading };
}

/** posición inicial: en tierra, cerca del centro, mirando a la isla. */
export function startWalker(objects: readonly PlacedObject[], catalog: ReadonlyMap<string, CatalogItem>, level: number): Walker {
  const candidates: Array<[number, number]> = [[590, 610], [500, 640], [420, 600], [500, 560], [560, 500], [CENTER.x, CENTER.y + 90]];
  const base = candidates.find(([x, y]) => canStand(x, y, objects, catalog, level)) ?? ([CENTER.x, CENTER.y] as [number, number]);
  return { x: base[0], y: base[1], heading: Math.atan2(CENTER.x - base[0], -(CENTER.y - base[1])) };
}

/** profundidad y desplazamiento lateral de un punto respecto a una cámara. */
export function toCamera(px: number, py: number, cam: { x: number; y: number; heading: number }) {
  const d = dirOf(cam.heading);
  const r = rightOf(cam.heading);
  const dx = px - cam.x;
  const dy = py - cam.y;
  return { depth: dx * d.x + dy * d.y, lateral: dx * r.x + dy * r.y };
}

export { landRadii };
