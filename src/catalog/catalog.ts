import type { CatalogItem } from '../domain/island';

const base = import.meta.env.BASE_URL;
const p = (name: string) => `${base}assets/decorations/${name}.svg`;

export const CATALOG: readonly CatalogItem[] = [
  { id: 'palmera', name: 'palmera', category: 'vegetacion', assetPath: p('palmera'), footprintRadius: 26, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'land', spriteSize: 225, anchorY: 0.92, cost: 20, charm: 6, unlockLevel: 1 },
  { id: 'arbol', name: 'árbol redondo', category: 'vegetacion', assetPath: p('arbol'), footprintRadius: 30, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'land', spriteSize: 195, anchorY: 0.92, cost: 15, charm: 5, unlockLevel: 1 },
  { id: 'flores', name: 'flores', category: 'vegetacion', assetPath: p('flores'), footprintRadius: 22, minScale: 0.7, maxScale: 2, orientations: [0, 1], placementZone: 'land', spriteSize: 130, anchorY: 0.9, cost: 8, charm: 3, unlockLevel: 1 },
  { id: 'roca', name: 'roca pulida', category: 'roca', assetPath: p('roca'), footprintRadius: 26, minScale: 0.7, maxScale: 1.8, orientations: [0, 1], placementZone: 'land', spriteSize: 130, anchorY: 0.9, cost: 10, charm: 2, unlockLevel: 1 },
  { id: 'cristal', name: 'cristal', category: 'cristal', assetPath: p('cristal'), footprintRadius: 20, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'land', spriteSize: 160, anchorY: 0.9, cost: 40, charm: 10, unlockLevel: 2 },
  { id: 'pez', name: 'pez decorativo', category: 'fauna', assetPath: p('pez'), footprintRadius: 16, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'water', spriteSize: 120, anchorY: 0.85, cost: 25, charm: 8, unlockLevel: 3 },
  { id: 'fuente', name: 'fuente', category: 'agua', assetPath: p('fuente'), footprintRadius: 38, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 200, anchorY: 0.92, cost: 60, charm: 14, unlockLevel: 4 },
  { id: 'pabellon', name: 'pabellón de vidrio', category: 'arquitectura', assetPath: p('pabellon'), footprintRadius: 50, minScale: 0.7, maxScale: 1.4, orientations: [0, 1], placementZone: 'land', spriteSize: 250, anchorY: 0.92, cost: 90, charm: 18, unlockLevel: 5 },
];

export const CATALOG_MAP: ReadonlyMap<string, CatalogItem> = new Map(CATALOG.map((c) => [c.id, c]));
