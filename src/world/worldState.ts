import { clampWorldCamera, type WorldCamera } from './worldCamera';

export interface WorldView extends WorldCamera {
  mode: 'lejos' | 'dentro';
  selectedId: string | null;
}

const KEY = 'frutiger-aero-islands:mundo:vista';

export function parseWorldView(raw: string | null): WorldView | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<WorldView>;
    if (v.mode !== 'lejos' && v.mode !== 'dentro') return null;
    if (![v.cx, v.cy, v.zoom].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    const cam = clampWorldCamera({ cx: v.cx as number, cy: v.cy as number, zoom: v.zoom as number });
    return { mode: v.mode, ...cam, selectedId: typeof v.selectedId === 'string' ? v.selectedId : null };
  } catch {
    return null;
  }
}

export function loadWorldView(storage: Pick<Storage, 'getItem'> = window.sessionStorage): WorldView | null {
  try {
    return parseWorldView(storage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveWorldView(v: WorldView, storage: Pick<Storage, 'setItem'> = window.sessionStorage): void {
  try {
    storage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: la vista no se restaura */
  }
}

/** al salir de la isla hacia el mundo: entrar directo al archipiélago con mi isla seleccionada. */
export function prepareFromIsland(islandPos: { x: number; y: number }, storage: Pick<Storage, 'setItem'> = window.sessionStorage): void {
  saveWorldView({ mode: 'dentro', zoom: 1.4, cx: islandPos.x, cy: islandPos.y, selectedId: 'mia' }, storage);
}
