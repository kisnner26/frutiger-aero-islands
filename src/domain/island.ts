export const WORLD_SIZE = 1000;
export const MAX_OBJECTS = 150;
export const MAX_HISTORY = 50;

export type PlacementZone = 'land' | 'water';

export interface PlacedObject {
  id: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  /** orientación gráfica admitida por el catálogo (0 normal, 1 espejo). */
  rotation: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: 'vegetacion' | 'roca' | 'cristal' | 'agua' | 'arquitectura' | 'fauna';
  assetPath: string;
  /** radio de apoyo en unidades de mundo (a escala 1). */
  footprintRadius: number;
  minScale: number;
  maxScale: number;
  orientations: number[];
  placementZone: PlacementZone;
  /** ancho dibujado en píxeles de escena a escala 1. */
  spriteSize: number;
  /** ancla vertical del pie dentro del sprite (0–1). */
  anchorY: number;
  /** coste en brillos. */
  cost: number;
  /** aportación al encanto. */
  charm: number;
  /** nivel necesario para desbloquear. */
  unlockLevel: number;
}
