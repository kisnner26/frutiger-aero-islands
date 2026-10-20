import { CATALOG_MAP } from '../catalog/catalog';
import type { PlacedObject } from '../domain/island';

export interface MissionContext {
  objects: readonly PlacedObject[];
  level: number;
  country: string | null;
  visitedWorld: boolean;
}

export interface Mission {
  id: string;
  title: string;
  text: string;
  goal: number;
  progress(ctx: MissionContext): number;
}

const kinds = (o: readonly PlacedObject[]) => new Set(o.map((x) => x.assetId)).size;
const inWater = (o: readonly PlacedObject[]) => o.filter((x) => CATALOG_MAP.get(x.assetId)?.placementZone === 'water').length;

/** misiones del faro: guían los primeros minutos y empujan a seguir decorando, explorar y colaborar. */
export const MISSIONS: readonly Mission[] = [
  { id: 'primera-luz', title: 'primera luz', text: 'coloca 3 objetos en tu isla', goal: 3, progress: (c) => c.objects.length },
  { id: 'jardin', title: 'jardín variado', text: 'usa 5 tipos distintos de decoración', goal: 5, progress: (c) => kinds(c.objects) },
  { id: 'mar-vivo', title: 'mar vivo', text: 'pon algo en el agua que rodea tu isla', goal: 1, progress: (c) => inWater(c.objects) },
  { id: 'tu-pais', title: 'tu rincón del mundo', text: 'elige tu país para aparecer en el mapa', goal: 1, progress: (c) => (c.country ? 1 : 0) },
  { id: 'viajera', title: 'mirar el planeta', text: 'viaja al mundo y busca las zonas grises', goal: 1, progress: (c) => (c.visitedWorld ? 1 : 0) },
  { id: 'nivel-3', title: 'faro encendido', text: 'llega al nivel 3 con tu isla', goal: 3, progress: (c) => c.level },
  { id: 'aldea', title: 'aldea aero', text: 'ten 15 objetos en tu isla', goal: 15, progress: (c) => c.objects.length },
  { id: 'gran-isla', title: 'isla grande', text: 'llega al nivel 7 y haz crecer tu isla', goal: 7, progress: (c) => c.level },
];

export function missionStatus(ctx: MissionContext) {
  return MISSIONS.map((m) => {
    const value = Math.min(m.goal, m.progress(ctx));
    return { mission: m, value, done: value >= m.goal };
  });
}

export function nextMission(ctx: MissionContext) {
  return missionStatus(ctx).find((s) => !s.done) ?? null;
}

const KEY = 'frutiger-aero-islands:visito-mundo';
export const worldVisit = {
  get(): boolean {
    try {
      return window.localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  },
  mark() {
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
  },
};
