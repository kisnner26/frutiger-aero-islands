import { describe, expect, it } from 'vitest';
import { claimNew } from '../src/persistence/milestones';

const doc = (pops: number, combo: number, n: number) => ({ objects: Array.from({ length: n }, (_, i) => ({ id: String(i), assetId: 'a' + i, x: 0, y: 0, scale: 1, rotation: 0 })), stats: { pops, bestCombo: combo }, maxLevel: 1 }) as never;

describe('milestones', () => {
  it('solo devuelve lo cumplido y no repetido', () => {
    const got = claimNew(doc(30, 5, 0), new Set(['combo-5'])).map((m) => m.id);
    expect(got).toEqual(['pops-25']);
  });
  it('cuenta tipos distintos de decoración', () => {
    expect(claimNew(doc(0, 0, 8), new Set()).map((m) => m.id)).toContain('kinds-8');
  });
});
