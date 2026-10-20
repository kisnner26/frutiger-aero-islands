export const BASIN_RADIUS = 1000;
export const WORLD_MIN_ZOOM = 0.5;
export const WORLD_MAX_ZOOM = 2.4;

export interface WorldCamera {
  /** centro de la vista en coordenadas de la cuenca. */
  cx: number;
  cy: number;
  zoom: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export const DEFAULT_WORLD_CAMERA: WorldCamera = { cx: 0, cy: 20, zoom: 1 };

export function worldFit(vp: Viewport): number {
  return Math.min(vp.width, vp.height * 1.2) / 1100;
}

export function clampWorldZoom(z: number): number {
  return Math.min(WORLD_MAX_ZOOM, Math.max(WORLD_MIN_ZOOM, z));
}

/** mantiene el centro de la vista dentro de la cuenca. */
export function clampWorldCamera(cam: WorldCamera): WorldCamera {
  const zoom = clampWorldZoom(cam.zoom);
  const limit = 760;
  const d = Math.hypot(cam.cx, cam.cy);
  const k = d > limit ? limit / d : 1;
  return { zoom, cx: cam.cx * k, cy: cam.cy * k };
}

export function worldToScreen(p: { x: number; y: number }, cam: WorldCamera, vp: Viewport) {
  const s = worldFit(vp) * cam.zoom;
  return { x: vp.width / 2 + (p.x - cam.cx) * s, y: vp.height / 2 + (p.y - cam.cy) * s };
}

export function screenToWorld(p: { x: number; y: number }, cam: WorldCamera, vp: Viewport) {
  const s = worldFit(vp) * cam.zoom;
  return { x: cam.cx + (p.x - vp.width / 2) / s, y: cam.cy + (p.y - vp.height / 2) / s };
}

/** zoom manteniendo fijo el punto bajo el puntero. */
export function zoomWorldAt(cam: WorldCamera, vp: Viewport, screen: { x: number; y: number }, nextZoom: number): WorldCamera {
  const before = screenToWorld(screen, cam, vp);
  const zoom = clampWorldZoom(nextZoom);
  const s = worldFit(vp) * zoom;
  return clampWorldCamera({ zoom, cx: before.x - (screen.x - vp.width / 2) / s, cy: before.y - (screen.y - vp.height / 2) / s });
}
