import { describe, expect, it } from 'vitest';
import { ARENA, EAT_RATIO, ROUND_TIME, START_MASS, createMatch, hazeRadius, radiusOf, ranking, step, totalMass, alive, type BlobInit } from '../src/features/blob/sim';

const inits = (n: number): BlobInit[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, hue: i * 30, isBot: true }));

describe('aero blob', () => {
  it('la bruma se mantiene, cierra la arena y termina en el radio mínimo', () => {
    expect(hazeRadius(0)).toBe(ARENA);
    expect(hazeRadius(100)).toBeLessThan(ARENA);
    expect(hazeRadius(ROUND_TIME)).toBeLessThan(700);
    let prev = ARENA + 1;
    for (let t = 0; t < 260; t += 5) {
      const r = hazeRadius(t);
      expect(r).toBeLessThanOrEqual(prev);
      prev = r;
    }
  });

  it('una partida solo de bots siempre termina, con puestos únicos y sin valores inválidos', () => {
    for (const seed of [1, 2, 3]) {
      const m = createMatch(seed, inits(12));
      let guard = 0;
      while (!m.over && guard++ < 30 * 300) step(m, 1 / 30, {});
      expect(m.over).toBe(true);
      expect(m.t).toBeLessThanOrEqual(ROUND_TIME + 0.1);
      for (const p of m.players) for (const c of p.cells) {
        expect(Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.mass)).toBe(true);
        expect(Math.hypot(c.x, c.y)).toBeLessThanOrEqual(ARENA + 1);
      }
      const places = m.players.map((p) => p.placement).filter(Boolean);
      expect(new Set(places).size).toBe(places.length);
      expect(m.players.filter((p) => p.placement === 1).length).toBe(1);
    }
  });

  it('una célula solo se come a otra bastante más pequeña', () => {
    const m = createMatch(5, inits(2));
    const [a, b] = m.players;
    a.shield = b.shield = 0;
    a.cells[0].x = 0; a.cells[0].y = 0; a.cells[0].mass = 200;
    b.cells[0].x = 0; b.cells[0].y = 0; b.cells[0].mass = 200 / (EAT_RATIO - 0.05);
    a.isBot = false; b.isBot = false;
    step(m, 0.01, {});
    expect(alive(m).length).toBe(2);
    b.cells[0].mass = 100;
    const before = totalMass(a);
    step(m, 0.01, {});
    expect(totalMass(a)).toBeGreaterThan(before);
    expect(b.alive).toBe(false);
  });

  it('dividirse reparte la masa y las mitades se funden pasado el tiempo', () => {
    const m = createMatch(6, inits(2));
    const a = m.players[0];
    a.isBot = false;
    a.cells[0].mass = 400;
    a.cells[0].x = a.cells[0].y = 0;
    const total = totalMass(a);
    step(m, 0.02, { p0: { tx: 500, ty: 0, split: true, eject: false, power: false } });
    expect(a.cells.length).toBe(2);
    expect(totalMass(a)).toBeCloseTo(total, 0);
    for (let i = 0; i < 60 * 20; i++) step(m, 1 / 60, { p0: { tx: a.cells[0].x, ty: a.cells[0].y, split: false, eject: false, power: false } });
    expect(a.cells.length).toBe(1);
  });

  it('el radio crece con la masa y el arranque es pequeño', () => {
    expect(radiusOf(START_MASS)).toBeLessThan(radiusOf(500));
    expect(ranking(createMatch(1, inits(3))).length).toBe(3);
  });
});
