import { describe, expect, it } from 'vitest';
import { TIERS, claim, passLevel, perks, tiers, XP_PER_TIER } from '../src/persistence/pass';

describe('pase', () => {
  it('tiene escalones y cada vía da algo', () => {
    expect(tiers).toHaveLength(TIERS);
    for (const t of tiers) {
      expect(t.free).toBeTruthy();
      expect(t.aero).toBeTruthy();
    }
  });
  it('la vía aero no se cobra sin derecho', () => {
    expect(claim('aero', 25, { free: [], aero: [] }, false)).toBe(0);
  });
  it('el nivel sale de la experiencia y tiene tope', () => {
    expect(passLevel(0).tier).toBe(0);
    expect(passLevel(XP_PER_TIER * 3 + 5).tier).toBe(3);
    expect(passLevel(10_000_000).tier).toBe(TIERS);
  });
  it('las ventajas solo existen con el pase aero', () => {
    expect(perks(false)).toEqual({ popBonus: 0, landDiscount: 0 });
    expect(perks(true).popBonus).toBeGreaterThan(0);
  });
});
