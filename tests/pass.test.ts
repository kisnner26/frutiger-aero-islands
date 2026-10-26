import { describe, expect, it } from 'vitest';
import { TIERS, claim, tiers } from '../src/persistence/pass';

describe('pase', () => {
  it('tiene escalones crecientes', () => {
    expect(tiers).toHaveLength(TIERS);
    expect(tiers[19].free).toBeGreaterThan(tiers[0].free);
  });
  it('la vía premium no se cobra sin derecho', () => {
    expect(claim('premium', 20, { free: [], premium: [] }, false)).toBe(0);
  });
});
