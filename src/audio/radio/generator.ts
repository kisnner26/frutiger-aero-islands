import type { TrackInfo } from './stations';

export type NoteKind = 'pad' | 'bass' | 'pluck' | 'bell' | 'shaker';

export interface NoteEvent {
  /** tiempo dentro del compás, en pulsos (0–4). */
  beat: number;
  /** duración en pulsos. */
  dur: number;
  midi: number;
  kind: NoteKind;
  vel: number;
}

export const BEATS_PER_BAR = 4;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** planifica un compás de forma determinista: misma pista y compás, mismas notas. */
export function planBar(track: TrackInfo, bar: number): NoteEvent[] {
  const rng = mulberry(track.seed * 7919 + bar * 104729);
  const chord = track.chords[((bar % track.chords.length) + track.chords.length) % track.chords.length];
  const ev: NoteEvent[] = [];

  for (let i = 1; i < chord.length; i++) ev.push({ beat: 0, dur: BEATS_PER_BAR + 0.5, midi: track.root + 12 + chord[i], kind: 'pad', vel: 0.34 });
  ev.push({ beat: 0, dur: BEATS_PER_BAR - 0.5, midi: track.root + chord[0] - 12 + 12, kind: 'bass', vel: 0.55 });

  const pool: number[] = [];
  for (let oct = 1; oct <= 2; oct++) for (const d of track.scale) pool.push(track.root + 12 * oct + 12 + d);
  let last = pool[Math.floor(rng() * pool.length)];
  for (let i = 0; i < 8; i++) {
    const strong = i % 2 === 0;
    if (rng() >= track.density * (strong ? 1 : 0.55)) continue;
    // la melodía se mueve por grados cercanos al anterior para sonar cantable
    const idx = Math.max(0, Math.min(pool.length - 1, pool.indexOf(last) + Math.round((rng() - 0.5) * 4)));
    last = pool[idx];
    ev.push({ beat: i * 0.5, dur: 0.9, midi: last, kind: 'pluck', vel: 0.22 + rng() * 0.2 });
  }

  if (track.bell) {
    for (const beat of [0, 2]) {
      if (rng() < 0.55) ev.push({ beat, dur: 3, midi: track.root + 36 + chord[1 + Math.floor(rng() * (chord.length - 1))] - 12, kind: 'bell', vel: 0.2 + rng() * 0.14 });
    }
  }

  if (track.shaker) {
    for (let i = 0; i < 8; i++) ev.push({ beat: i * 0.5, dur: 0.1, midi: 0, kind: 'shaker', vel: i % 2 ? 0.05 : 0.09 });
  }
  return ev.sort((a, b) => a.beat - b.beat);
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function barSeconds(track: TrackInfo): number {
  return (BEATS_PER_BAR * 60) / track.bpm;
}
