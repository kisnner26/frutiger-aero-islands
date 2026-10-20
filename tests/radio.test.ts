import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, barSeconds, midiToHz, planBar } from '../src/audio/radio/generator';
import { AMBIENCE_IDS, GENERATIVE_AUTHOR, STATIONS } from '../src/audio/radio/stations';

describe('catálogo de la radio', () => {
  it('tiene tres emisoras con tres pistas, ids únicos y autor real', () => {
    expect(STATIONS.map((s) => s.id)).toEqual(['acuatico', 'jardin', 'noche']);
    const ids = STATIONS.flatMap((s) => s.tracks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(9);
    for (const s of STATIONS) for (const t of s.tracks) {
      expect(t.title.length).toBeGreaterThan(2);
      expect(t.title).toBe(t.title.toLowerCase());
      expect(t.author).toBe(GENERATIVE_AUTHOR);
      expect(t.bpm).toBeGreaterThan(30);
    }
    expect(AMBIENCE_IDS).toHaveLength(4);
  });
});

describe('generador', () => {
  const track = STATIONS[0].tracks[0];

  it('es determinista por pista y compás', () => {
    expect(planBar(track, 5)).toEqual(planBar(track, 5));
    expect(planBar(track, 5)).not.toEqual(planBar(track, 6));
  });

  it('las pistas distintas suenan distinto', () => {
    expect(planBar(STATIONS[0].tracks[0], 1)).not.toEqual(planBar(STATIONS[0].tracks[1], 1));
  });

  it('las notas caen dentro del compás y en un registro audible', () => {
    for (const st of STATIONS) for (const t of st.tracks) for (let bar = 0; bar < 16; bar++) {
      for (const e of planBar(t, bar)) {
        expect(e.beat).toBeGreaterThanOrEqual(0);
        expect(e.beat).toBeLessThan(BEATS_PER_BAR);
        expect(e.vel).toBeGreaterThan(0);
        expect(e.vel).toBeLessThanOrEqual(1);
        if (e.kind !== 'shaker') {
          const hz = midiToHz(e.midi);
          expect(hz).toBeGreaterThan(25);
          expect(hz).toBeLessThan(4200);
        }
      }
    }
  });

  it('cada compás lleva colchón armónico y bajo; las pistas con campana o pulso los usan', () => {
    const ev = planBar(track, 0);
    expect(ev.some((e) => e.kind === 'pad')).toBe(true);
    expect(ev.filter((e) => e.kind === 'bass')).toHaveLength(1);
    const jardin = STATIONS[1].tracks[0];
    expect(planBar(jardin, 0).filter((e) => e.kind === 'shaker')).toHaveLength(8);
  });

  it('el compás dura lo que marca el tempo', () => {
    expect(barSeconds({ ...track, bpm: 60 })).toBe(4);
    expect(midiToHz(69)).toBe(440);
  });
});

import { DEFAULT_PREFS, parsePrefs } from '../src/audio/radio/prefs';

describe('preferencias de la radio', () => {
  it('sin datos usa valores por defecto y no hay consentimiento previo', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(null).consent).toBe(false);
  });

  it('descarta datos corruptos y acota valores', () => {
    expect(parsePrefs('{no es json')).toEqual(DEFAULT_PREFS);
    const p = parsePrefs(JSON.stringify({ consent: true, station: 'noche', track: { noche: 2, jardin: 99 }, volume: 7, ambience: { lluvia: true, olas: 'si' }, ambienceLevel: -3 }));
    expect(p).toMatchObject({ consent: true, station: 'noche', volume: 1, ambienceLevel: 0 });
    expect(p.track.noche).toBe(2);
    expect(p.track.jardin).toBe(0);
    expect(p.ambience).toEqual({ lluvia: true, olas: false, aves: false, burbujas: false });
  });

  it('una emisora desconocida vuelve a la predeterminada', () => {
    expect(parsePrefs(JSON.stringify({ station: 'inventada' })).station).toBe('acuatico');
  });
});
