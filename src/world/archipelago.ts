import { CATALOG_MAP } from '../catalog/catalog';
import type { PlacedObject } from '../domain/island';
import { initialDoc, type Doc } from '../features/editor/commands';
import { localRepository } from '../persistence/localDraft';
import type { RealIsland } from '../persistence/world';
import { countryAnchor, placeIslands } from './geoProjection';
import { tr } from '../i18n';

export type IslandKind = 'mia' | 'jugador';

export interface WorldIsland {
  id: string;
  kind: IslandKind;
  /** "mi isla" o "@usuario". */
  name: string;
  username: string | null;
  /** país elegido (código iso) o null si aún no eligió. */
  country: string | null;
  /** posición en la cuenca interior. */
  x: number;
  y: number;
  objects: PlacedObject[];
  level: number;
}

/** isla local del jugador: el borrador guardado o, si no existe, la isla inicial. */
export function loadMine(): { objects: PlacedObject[]; level: number } {
  const res = localRepository.load();
  const doc: Doc = res.status === 'ok' ? res.doc : initialDoc();
  return { objects: doc.objects, level: doc.maxLevel };
}

/** islas de personas reales: la propia (si existe) y las de otros jugadores, repartidas por la zona de su país. */
export function buildArchipelago(mine: { objects: PlacedObject[]; level: number } | null, others: readonly RealIsland[] = [], country: string | null = null): WorldIsland[] {
  const pos = placeIslands([
    ...(mine ? [{ id: 'mia', country, order: -1, priority: 0 }] : []),
    ...others.map((o, i) => ({ id: o.id, country: o.country, order: Date.parse(o.createdAt) || i })),
  ]);
  const at = (id: string) => pos.get(id) ?? { x: 0, y: 0 };
  const list: WorldIsland[] = [];
  if (mine) list.push({ id: 'mia', kind: 'mia', name: tr('mi isla', 'my island'), username: null, country, ...at('mia'), objects: mine.objects, level: mine.level });
  for (const o of others) list.push({ id: o.id, kind: 'jugador', name: `@${o.username}`, username: o.username, country: o.country, ...at(o.id), objects: o.objects, level: o.level });
  return list.filter((i) => i.objects.every((obj) => CATALOG_MAP.has(obj.assetId)));
}

/** posición de mi isla en la cuenca según el país elegido. */
export function minePosition(country: string | null): { x: number; y: number } {
  return countryAnchor(country);
}
