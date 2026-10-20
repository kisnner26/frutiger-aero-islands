import { CENTER } from '../domain/geometry';

/** unidades de escena por unidad de mundo y compresión vertical fija (2.5d). */
export const K = 0.9;
export const TILT = 0.55;

export interface Point {
  x: number;
  y: number;
}

export function project(x: number, y: number): Point {
  return { x: (x - CENTER.x) * K, y: (y - CENTER.y) * K * TILT };
}

export function unproject(px: number, py: number): Point {
  return { x: px / K + CENTER.x, y: py / (K * TILT) + CENTER.y };
}

/** profundidad por y proyectada, con desempate por id. */
export function depthCompare(a: { y: number; id: string }, b: { y: number; id: string }): number {
  return a.y - b.y || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
