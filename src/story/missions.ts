import { CATALOG_MAP } from '../catalog/catalog';
import type { PlacedObject } from '../domain/island';
import { tr } from '../i18n';

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
  { id: 'primera-luz', title: tr('primera luz', 'first light'), text: tr('coloca 3 objetos en tu isla', 'place 3 objects on your island'), goal: 3, progress: (c) => c.objects.length },
  { id: 'jardin', title: tr('jardín variado', 'varied garden'), text: tr('usa 5 tipos distintos de decoración', 'use 5 different kinds of decoration'), goal: 5, progress: (c) => kinds(c.objects) },
  { id: 'mar-vivo', title: tr('mar vivo', 'living sea'), text: tr('pon algo en el agua que rodea tu isla', 'put something in the water around your island'), goal: 1, progress: (c) => inWater(c.objects) },
  { id: 'tu-pais', title: tr('tu rincón del mundo', 'your corner of the world'), text: tr('elige tu país para aparecer en el mapa', 'choose your country to appear on the map'), goal: 1, progress: (c) => (c.country ? 1 : 0) },
  { id: 'viajera', title: tr('mirar el planeta', 'look at the planet'), text: tr('viaja al mundo y busca las zonas grises', 'travel to the world and look for the gray zones'), goal: 1, progress: (c) => (c.visitedWorld ? 1 : 0) },
  { id: 'nivel-3', title: tr('faro encendido', 'lit beacon'), text: tr('llega al nivel 3 con tu isla', 'reach level 3 with your island'), goal: 3, progress: (c) => c.level },
  { id: 'aldea', title: tr('aldea aero', 'aero village'), text: tr('ten 15 objetos en tu isla', 'have 15 objects on your island'), goal: 15, progress: (c) => c.objects.length },
  { id: 'gran-isla', title: tr('isla grande', 'big island'), text: tr('llega al nivel 7 y haz crecer tu isla', 'reach level 7 and grow your island'), goal: 7, progress: (c) => c.level },
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
