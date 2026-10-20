import { CATALOG_MAP } from '../catalog/catalog';
import { validateSaved } from '../domain/geometry';
import { MAX_OBJECTS, type PlacedObject } from '../domain/island';
import type { Doc } from '../features/editor/commands';

const KEY = 'frutiger-aero-islands:borrador';
export const DRAFT_VERSION = 1;

export type LoadResult = { status: 'ok'; doc: Doc } | { status: 'vacio' } | { status: 'corrupto' };
export type SaveResult = 'ok' | 'cuota' | 'error';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** valida un borrador desconocido; devuelve null si algo no cuadra. */
export function parseDraft(raw: string): Doc | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data) || data.version !== DRAFT_VERSION || !Array.isArray(data.objects)) return null;
  if (data.objects.length > MAX_OBJECTS) return null;
  const maxLevel = Number(data.maxLevel);
  const ids = new Set<string>();
  const objects: PlacedObject[] = [];
  for (const o of data.objects) {
    if (!isObj(o) || typeof o.id !== 'string' || typeof o.assetId !== 'string') return null;
    const obj: PlacedObject = { id: o.id, assetId: o.assetId, x: Number(o.x), y: Number(o.y), scale: Number(o.scale), rotation: Number(o.rotation) };
    if (ids.has(obj.id) || validateSaved(CATALOG_MAP.get(obj.assetId), obj, Number.isInteger(maxLevel) ? maxLevel : 1)) return null;
    ids.add(obj.id);
    objects.push(obj);
  }
  const brillos = Number(data.brillos);
  const stats = isObj(data.stats) ? data.stats : {};
  if (!Number.isFinite(brillos) || brillos < 0 || !Number.isInteger(maxLevel) || maxLevel < 1) return null;
  return {
    objects,
    brillos: Math.floor(brillos),
    maxLevel,
    stats: { pops: Math.max(0, Math.floor(Number(stats.pops) || 0)), bestCombo: Math.max(0, Math.floor(Number(stats.bestCombo) || 0)) },
  };
}

export function loadDraft(storage: Pick<Storage, 'getItem'> = window.localStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { status: 'vacio' };
  }
  if (raw === null) return { status: 'vacio' };
  const doc = parseDraft(raw);
  return doc ? { status: 'ok', doc } : { status: 'corrupto' };
}

export function saveDraft(doc: Doc, storage: Pick<Storage, 'setItem'> = window.localStorage): SaveResult {
  try {
    storage.setItem(KEY, JSON.stringify({ version: DRAFT_VERSION, savedAt: new Date().toISOString(), ...doc }));
    return 'ok';
  } catch (e) {
    return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22) ? 'cuota' : 'error';
  }
}

/** conserva el borrador corrupto bajo otra clave para no destruirlo. */
export function quarantineCorrupt(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = window.localStorage): void {
  try {
    const raw = storage.getItem(KEY);
    if (raw !== null) storage.setItem(`${KEY}:corrupto`, raw);
    storage.removeItem(KEY);
  } catch {
    /* sin almacenamiento disponible */
  }
}

export interface IslandRepository {
  load(): LoadResult;
  save(doc: Doc): SaveResult;
}

export const localRepository: IslandRepository = {
  load: () => loadDraft(),
  save: (doc) => saveDraft(doc),
};
