import type { Point } from './projection';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.5;

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Viewport {
  width: number;
  height: number;
  /** radio horizontal de la tierra en unidades de mundo; las islas ampliadas se alejan solas para caber. */
  reach?: number;
}

const BASE_REACH = 440;
const grown = (vp: Viewport) => Math.max(1, (vp.reach ?? BASE_REACH) / BASE_REACH);

export const DEFAULT_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 };

/** escala base para que la isla quepa; la cámara no altera posiciones del mundo. */
export function fitScale(vp: Viewport): number {
  const byWidth = (vp.width * 0.96) / 820;
  const byHeight = (vp.height * 0.6) / 480;
  return Math.max(0.01, Math.min(Math.max(0.2 / grown(vp), Math.min(byWidth, byHeight) / grown(vp)), 1.4));
}

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function clampCamera(cam: Camera, vp: Viewport): Camera {
  const zoom = clampZoom(cam.zoom);
  const s = fitScale(vp) * zoom;
  const limitX = 450 * grown(vp) * s + vp.width * 0.2;
  const limitY = 300 * grown(vp) * s + vp.height * 0.2;
  return {
    zoom,
    panX: Math.min(limitX, Math.max(-limitX, cam.panX)),
    panY: Math.min(limitY, Math.max(-limitY, cam.panY)),
  };
}

export function sceneToScreen(p: Point, cam: Camera, vp: Viewport): Point {
  const s = fitScale(vp) * cam.zoom;
  return { x: vp.width / 2 + cam.panX + p.x * s, y: vp.height * 0.45 + cam.panY + p.y * s };
}

export function screenToScene(p: Point, cam: Camera, vp: Viewport): Point {
  const s = fitScale(vp) * cam.zoom;
  return { x: (p.x - vp.width / 2 - cam.panX) / s, y: (p.y - vp.height * 0.45 - cam.panY) / s };
}

/** zoom manteniendo fijo el punto bajo el puntero. */
export function zoomAt(cam: Camera, vp: Viewport, screen: Point, nextZoom: number): Camera {
  const before = screenToScene(screen, cam, vp);
  const zoom = clampZoom(nextZoom);
  const s = fitScale(vp) * zoom;
  const next: Camera = {
    zoom,
    panX: screen.x - vp.width / 2 - before.x * s,
    panY: screen.y - vp.height * 0.45 - before.y * s,
  };
  return clampCamera(next, vp);
}
