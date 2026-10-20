/** cuadrícula global de parcelas (como r/place): el mundo se divide en 24×24 celdas dentro del círculo de la cuenca. */
export const GRID = 24;
export const CELL = 70;
export const MAX_ENERGY = 5;
export const RESTORE_STEP = 20;
export const RESTORE_CAP_PER_PERSON = 40;

export interface CellRef {
  cx: number;
  cy: number;
}

export interface CellInfo {
  cx: number;
  cy: number;
  owner: string | null;
  country: string | null;
  shieldUntil: number;
  /** 0 = dañada, 100 = restaurada. */
  progress: number;
}

export const cellKey = (cx: number, cy: number) => `${cx},${cy}`;

/** centro de una celda en coordenadas del mundo (el mismo sistema que las islas). */
export function cellCenter(cx: number, cy: number): { x: number; y: number } {
  return { x: (cx + 0.5 - GRID / 2) * CELL, y: (cy + 0.5 - GRID / 2) * CELL };
}

export function cellAt(x: number, y: number): CellRef | null {
  const cx = Math.floor(x / CELL + GRID / 2);
  const cy = Math.floor(y / CELL + GRID / 2);
  return inWorld(cx, cy) ? { cx, cy } : null;
}

/** igual que el servidor: dentro de la cuadrícula y del círculo de radio 11.6 celdas. */
export function inWorld(cx: number, cy: number): boolean {
  if (!Number.isInteger(cx) || !Number.isInteger(cy) || cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) return false;
  return (cx + 0.5 - GRID / 2) ** 2 + (cy + 0.5 - GRID / 2) ** 2 <= 11.6 ** 2;
}

export const ALL_CELLS: readonly CellRef[] = (() => {
  const out: CellRef[] = [];
  for (let cy = 0; cy < GRID; cy++) for (let cx = 0; cx < GRID; cx++) if (inWorld(cx, cy)) out.push({ cx, cy });
  return out;
})();

/** color estable por jugador (tono HSL derivado del nombre). */
export function ownerHue(name: string): number {
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function ownerColor(name: string): number {
  const h = ownerHue(name) / 360;
  const s = 0.62;
  const l = 0.52;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

export interface ActionHint {
  action: 'restaurar' | 'reclamar' | 'capturar' | null;
  reason: string;
}

/** qué puede hacer una persona con una celda (el servidor valida de nuevo todo). */
export function claimHint(cell: CellInfo, me: { name: string | null; owned: number; adjacentOwned: boolean; energy: number }, now = Date.now()): ActionHint {
  if (!me.name) return { action: null, reason: 'conecta tu cuenta para conquistar' };
  if (cell.owner === me.name) return { action: null, reason: 'esta parcela es tuya' };
  if (cell.owner) {
    if (cell.shieldUntil > now) return { action: null, reason: 'tiene escudo temporal' };
    if (me.owned > 0 && !me.adjacentOwned) return { action: null, reason: 'solo puedes expandirte junto a tus parcelas' };
    return me.energy >= 2 ? { action: 'capturar', reason: 'cuesta 2 de energía' } : { action: null, reason: 'te faltan 2 de energía' };
  }
  if (me.owned > 0 && !me.adjacentOwned) return { action: null, reason: 'solo puedes expandirte junto a tus parcelas' };
  return me.energy >= 1 ? { action: 'reclamar', reason: 'cuesta 1 de energía' } : { action: null, reason: 'te falta energía' };
}
