import { AMBIENCE_IDS, STATIONS, type AmbienceId, type StationId } from './stations';

const KEY = 'frutiger-aero-islands:radio';

export interface RadioPrefs {
  v: 1;
  /** el usuario dejó la radio encendida: permite reanudar con su primer gesto. */
  consent: boolean;
  station: StationId;
  track: Record<StationId, number>;
  volume: number;
  ambience: Record<AmbienceId, boolean>;
  ambienceLevel: number;
}

export const DEFAULT_PREFS: RadioPrefs = {
  v: 1,
  consent: false,
  station: 'acuatico',
  track: { acuatico: 0, jardin: 0, noche: 0, personal: 0 },
  volume: 0.55,
  ambience: { lluvia: false, olas: false, aves: false, burbujas: false },
  ambienceLevel: 0.5,
};

const clamp01 = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback);

export function parsePrefs(raw: string | null): RadioPrefs {
  if (!raw) return structuredClone(DEFAULT_PREFS);
  try {
    const p = JSON.parse(raw) as Partial<RadioPrefs>;
    const stations: StationId[] = [...STATIONS.map((s) => s.id), 'personal'];
    const station = stations.includes(p.station as StationId) ? (p.station as StationId) : DEFAULT_PREFS.station;
    const track = { ...DEFAULT_PREFS.track };
    for (const s of STATIONS) {
      const n = p.track?.[s.id];
      if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < s.tracks.length) track[s.id] = n;
    }
    const ambience = { ...DEFAULT_PREFS.ambience };
    for (const id of AMBIENCE_IDS) if (typeof p.ambience?.[id] === 'boolean') ambience[id] = p.ambience[id] as boolean;
    return { v: 1, consent: p.consent === true, station, track, volume: clamp01(p.volume, DEFAULT_PREFS.volume), ambience, ambienceLevel: clamp01(p.ambienceLevel, DEFAULT_PREFS.ambienceLevel) };
  } catch {
    return structuredClone(DEFAULT_PREFS);
  }
}

export function loadPrefs(): RadioPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(KEY));
  } catch {
    return structuredClone(DEFAULT_PREFS);
  }
}

export function savePrefs(p: RadioPrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: las preferencias no se recuerdan */
  }
}
