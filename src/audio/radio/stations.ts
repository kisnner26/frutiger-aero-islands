import { tr } from '../../i18n';
export type StationId = 'acuatico' | 'jardin' | 'noche' | 'personal';
export type AmbienceId = 'lluvia' | 'olas' | 'aves' | 'burbujas';

export const AMBIENCE_IDS: readonly AmbienceId[] = ['lluvia', 'olas', 'aves', 'burbujas'];
export const AMBIENCE_LABELS: Record<AmbienceId, string> = { lluvia: tr('lluvia', 'rain'), olas: tr('olas', 'waves'), aves: tr('aves', 'birds'), burbujas: tr('burbujas', 'bubbles') };

export const GENERATIVE_AUTHOR = tr('frutiger aero islands, música generativa', 'frutiger aero islands, generative music');

export interface TrackInfo {
  id: string;
  title: string;
  author: string;
  /** semilla de la pieza: la misma semilla produce siempre la misma música. */
  seed: number;
  bpm: number;
  /** nota midi de la tónica (grave). */
  root: number;
  /** grados de la escala pentatónica/modal para las melodías, en semitonos sobre la tónica. */
  scale: number[];
  /** acordes como semitonos sobre la tónica; el primero es el bajo. */
  chords: number[][];
  /** probabilidad de nota melódica por corchea (0–1). */
  density: number;
  /** campanas con reverberación larga. */
  bell: boolean;
  /** pulso suave de percusión. */
  shaker: boolean;
  /** corte del filtro del colchón armónico en hz. */
  padCutoff: number;
}

export interface Station {
  id: Exclude<StationId, 'personal'>;
  name: string;
  description: string;
  tracks: TrackInfo[];
}

const mk = (t: Omit<TrackInfo, 'author'>): TrackInfo => ({ ...t, author: GENERATIVE_AUTHOR });

export const STATIONS: readonly Station[] = [
  {
    id: 'acuatico',
    name: tr('acuático', 'aquatic'),
    description: tr('colchones suaves y campanas de agua', 'soft pads and water bells'),
    tracks: [
      mk({ id: 'acuatico-1', title: tr('marea de cristal', 'glass tide'), seed: 1101, bpm: 58, root: 50, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 14, 16], [-3, 4, 11, 14], [-5, 2, 7, 11], [-7, 0, 7, 9]], density: 0.3, bell: true, shaker: false, padCutoff: 1400 }),
      mk({ id: 'acuatico-2', title: tr('burbujas lentas', 'slow bubbles'), seed: 1202, bpm: 52, root: 52, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 15, 19], [-4, 3, 10, 15], [-2, 5, 12, 15], [-5, 2, 7, 14]], density: 0.22, bell: true, shaker: false, padCutoff: 1100 }),
      mk({ id: 'acuatico-3', title: tr('lago al amanecer', 'lake at dawn'), seed: 1303, bpm: 64, root: 53, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 11, 16], [-5, 4, 7, 14], [-3, 4, 9, 16], [-7, 5, 9, 12]], density: 0.36, bell: true, shaker: false, padCutoff: 1800 }),
    ],
  },
  {
    id: 'jardin',
    name: tr('jardín', 'garden'),
    description: tr('notas pulsadas, sol y pasos ligeros', 'plucked notes, sunshine and light steps'),
    tracks: [
      mk({ id: 'jardin-1', title: tr('paseo de pétalos', 'petal walk'), seed: 2101, bpm: 84, root: 48, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 12, 16], [-3, 4, 9, 12], [-7, 5, 9, 12], [-5, 2, 7, 11]], density: 0.5, bell: false, shaker: true, padCutoff: 2400 }),
      mk({ id: 'jardin-2', title: tr('invernadero', 'greenhouse'), seed: 2202, bpm: 76, root: 50, scale: [0, 2, 5, 7, 9], chords: [[0, 7, 11, 16], [-2, 5, 9, 14], [-5, 4, 7, 12], [-7, 0, 5, 9]], density: 0.44, bell: true, shaker: true, padCutoff: 2000 }),
      mk({ id: 'jardin-3', title: tr('sendero de luz', 'path of light'), seed: 2303, bpm: 92, root: 55, scale: [0, 2, 4, 7, 9], chords: [[0, 7, 12, 16], [-5, 4, 7, 14], [-3, 4, 9, 12], [-7, 2, 5, 9]], density: 0.56, bell: false, shaker: true, padCutoff: 2800 }),
    ],
  },
  {
    id: 'noche',
    name: tr('noche', 'night'),
    description: tr('caja de música, graves lentos y agua quieta', 'music box, slow bass and still water'),
    tracks: [
      mk({ id: 'noche-1', title: tr('luciérnagas', 'fireflies'), seed: 3101, bpm: 50, root: 45, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 12, 15], [-2, 5, 10, 14], [-4, 3, 8, 12], [-5, 2, 7, 10]], density: 0.2, bell: true, shaker: false, padCutoff: 800 }),
      mk({ id: 'noche-2', title: tr('luna en el lago', 'moon on the lake'), seed: 3202, bpm: 46, root: 47, scale: [0, 2, 3, 7, 8], chords: [[0, 7, 10, 15], [-4, 3, 8, 12], [-2, 5, 8, 14], [-7, 0, 5, 8]], density: 0.16, bell: true, shaker: false, padCutoff: 700 }),
      mk({ id: 'noche-3', title: tr('agua quieta', 'still water'), seed: 3303, bpm: 54, root: 43, scale: [0, 3, 5, 7, 10], chords: [[0, 7, 14, 15], [-2, 5, 12, 14], [-5, 2, 9, 12], [-7, 0, 7, 10]], density: 0.24, bell: true, shaker: false, padCutoff: 900 }),
    ],
  },
];

export const PERSONAL_TRACK = {
  id: 'personal-1',
  title: 'a calm frutiger aero playlist',
  author: tr('autor no indicado', 'author not listed'),
  note: tr('pista personal del autor del juego, incluida por su decisión', "the game author's personal track, included by their choice"),
};

export function findStation(id: StationId): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}
