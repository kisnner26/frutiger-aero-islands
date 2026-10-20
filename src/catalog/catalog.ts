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
  { id: 'girasol', name: 'girasoles', category: 'vegetacion', assetPath: p('girasol'), footprintRadius: 24, minScale: 0.7, maxScale: 1.8, orientations: [0, 1], placementZone: 'land', spriteSize: 150, anchorY: 0.92, cost: 12, charm: 4, unlockLevel: 1 },
  { id: 'arbusto', name: 'arbusto florido', category: 'vegetacion', assetPath: p('arbusto'), footprintRadius: 30, minScale: 0.7, maxScale: 1.7, orientations: [0, 1], placementZone: 'land', spriteSize: 150, anchorY: 0.9, cost: 18, charm: 5, unlockLevel: 1 },
  { id: 'banco', name: 'banco de madera', category: 'mobiliario', assetPath: p('banco'), footprintRadius: 32, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 150, anchorY: 0.9, cost: 22, charm: 5, unlockLevel: 2 },
  { id: 'hongos', name: 'hongos de colores', category: 'vegetacion', assetPath: p('hongos'), footprintRadius: 24, minScale: 0.7, maxScale: 1.8, orientations: [0, 1], placementZone: 'land', spriteSize: 130, anchorY: 0.9, cost: 26, charm: 6, unlockLevel: 2 },
  { id: 'farol', name: 'farol de cristal', category: 'mobiliario', assetPath: p('farol'), footprintRadius: 16, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 190, anchorY: 0.93, cost: 35, charm: 9, unlockLevel: 2 },
  { id: 'nenufar', name: 'nenúfar', category: 'agua', assetPath: p('nenufar'), footprintRadius: 34, minScale: 0.7, maxScale: 1.8, orientations: [0, 1], placementZone: 'water', spriteSize: 120, anchorY: 0.6, cost: 20, charm: 6, unlockLevel: 2 },
  { id: 'burbuja', name: 'burbuja gigante', category: 'cielo', assetPath: p('burbuja'), footprintRadius: 34, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'land', spriteSize: 150, anchorY: 0.9, cost: 45, charm: 11, unlockLevel: 3 },
  { id: 'boya', name: 'boya', category: 'agua', assetPath: p('boya'), footprintRadius: 22, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'water', spriteSize: 120, anchorY: 0.8, cost: 25, charm: 6, unlockLevel: 3 },
  { id: 'columpio', name: 'columpio', category: 'ocio', assetPath: p('columpio'), footprintRadius: 40, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 190, anchorY: 0.92, cost: 50, charm: 11, unlockLevel: 3 },
  { id: 'picnic', name: 'mesa de picnic', category: 'mobiliario', assetPath: p('picnic'), footprintRadius: 44, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 190, anchorY: 0.92, cost: 60, charm: 12, unlockLevel: 4 },
  { id: 'medusa', name: 'medusa luminosa', category: 'fauna', assetPath: p('medusa'), footprintRadius: 26, minScale: 0.7, maxScale: 1.7, orientations: [0, 1], placementZone: 'water', spriteSize: 130, anchorY: 0.85, cost: 50, charm: 12, unlockLevel: 4 },
  { id: 'molino', name: 'molino blanco', category: 'arquitectura', assetPath: p('molino'), footprintRadius: 30, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 210, anchorY: 0.93, cost: 80, charm: 15, unlockLevel: 5 },
  { id: 'velero', name: 'velero', category: 'agua', assetPath: p('velero'), footprintRadius: 38, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'water', spriteSize: 170, anchorY: 0.85, cost: 70, charm: 14, unlockLevel: 5 },
  { id: 'casita', name: 'casita aqua', category: 'arquitectura', assetPath: p('casita'), footprintRadius: 48, minScale: 0.7, maxScale: 1.4, orientations: [0, 1], placementZone: 'land', spriteSize: 210, anchorY: 0.92, cost: 110, charm: 20, unlockLevel: 6 },
  { id: 'delfin', name: 'delfín', category: 'fauna', assetPath: p('delfin'), footprintRadius: 34, minScale: 0.7, maxScale: 1.6, orientations: [0, 1], placementZone: 'water', spriteSize: 170, anchorY: 0.85, cost: 90, charm: 16, unlockLevel: 6 },
  { id: 'estatua', name: 'estatua de cristal', category: 'cristal', assetPath: p('estatua'), footprintRadius: 28, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 200, anchorY: 0.92, cost: 100, charm: 19, unlockLevel: 7 },
  { id: 'globo', name: 'globo aerostático', category: 'cielo', assetPath: p('globo'), footprintRadius: 30, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 230, anchorY: 0.93, cost: 140, charm: 22, unlockLevel: 8 },
  { id: 'arcoiris', name: 'arcoíris', category: 'cielo', assetPath: p('arcoiris'), footprintRadius: 50, minScale: 0.7, maxScale: 1.5, orientations: [0, 1], placementZone: 'land', spriteSize: 240, anchorY: 0.9, cost: 200, charm: 28, unlockLevel: 9 },
];

export const CATALOG_MAP: ReadonlyMap<string, CatalogItem> = new Map(CATALOG.map((c) => [c.id, c]));
