import { CATALOG_MAP } from '../catalog/catalog';
import type { PlacedObject } from '../domain/island';
import { initialDoc, type Doc } from '../features/editor/commands';
import { localRepository } from '../persistence/localDraft';
import { placeIslands } from './geoProjection';

export type IslandKind = 'mia' | 'ejemplo';

export interface WorldIsland {
  id: string;
  kind: IslandKind;
  name: string;
  /** país elegido (código iso) o null si aún no eligió. */
  country: string | null;
  /** posición en la cuenca interior. */
  x: number;
  y: number;
  objects: PlacedObject[];
  /** datos para la tarjeta; solo existen para la isla propia. */
  level: number | null;
}

type Spec = [assetId: string, x: number, y: number, scale?: number, rotation?: number];

const build = (prefix: string, specs: Spec[]): PlacedObject[] =>
  specs.map(([assetId, x, y, scale = 1, rotation = 0], i) => ({ id: `${prefix}-${i}`, assetId, x, y, scale, rotation }));

/** islas de ejemplo del prototipo: composiciones fijas para evaluar la vista; no pertenecen a ningún jugador. */
export const EXAMPLE_LAYOUTS: Array<{ id: string; country: string; specs: Spec[] }> = [
  { id: 'ejemplo-1', country: 'mx', specs: [['arbol', 420, 470], ['flores', 540, 520], ['flores', 470, 560, 1, 1], ['fuente', 610, 480], ['roca', 380, 560], ['palmera', 670, 540, 0.9, 1]] },
  { id: 'ejemplo-2', country: 'es', specs: [['cristal', 450, 480], ['cristal', 560, 500, 1.2], ['pabellon', 520, 430, 0.9], ['roca', 420, 570], ['flores', 610, 570]] },
  { id: 'ejemplo-3', country: 'jp', specs: [['palmera', 380, 470], ['palmera', 520, 440, 1.1], ['palmera', 640, 500, 0.9, 1], ['flores', 480, 545], ['roca', 570, 585], ['pez', 60, 520]] },
  { id: 'ejemplo-4', country: 'au', specs: [['pabellon', 500, 480], ['arbol', 380, 530], ['arbol', 620, 530, 1, 1], ['flores', 500, 585], ['fuente', 440, 420, 0.8]] },
  { id: 'ejemplo-5', country: 'za', specs: [['palmera', 480, 480], ['flores', 560, 545], ['roca', 420, 565, 1, 1]] },
];

/** isla local del jugador: el borrador guardado o, si no existe, la isla inicial. */
export function loadMine(): { objects: PlacedObject[]; level: number } {
  const res = localRepository.load();
  const doc: Doc = res.status === 'ok' ? res.doc : initialDoc();
  return { objects: doc.objects, level: doc.maxLevel };
}

export function buildArchipelago(mine: { objects: PlacedObject[]; level: number }, country: string | null = null): WorldIsland[] {
  const pos = placeIslands([{ id: 'mia', country, order: -1, priority: 0 }, ...EXAMPLE_LAYOUTS.map((e, i) => ({ id: e.id, country: e.country, order: i }))]);
  const at = (id: string) => pos.get(id) ?? { x: 0, y: 0 };
  const islands: WorldIsland[] = [
    { id: 'mia', kind: 'mia', name: 'mi isla', country, ...at('mia'), objects: mine.objects, level: mine.level },
    ...EXAMPLE_LAYOUTS.map<WorldIsland>((e, i) => ({ id: e.id, kind: 'ejemplo', name: `isla de ejemplo ${i + 1}`, country: e.country, ...at(e.id), objects: build(e.id, e.specs), level: null })),
  ];
  return islands.filter((i) => i.objects.every((o) => CATALOG_MAP.has(o.assetId)));
}

/** posición de mi isla en la cuenca según el país elegido. */
export function minePosition(country: string | null): { x: number; y: number } {
  const mine = buildArchipelago({ objects: [], level: 1 }, country).find((i) => i.id === 'mia');
  return mine ? { x: mine.x, y: mine.y } : { x: 0, y: 0 };
}
