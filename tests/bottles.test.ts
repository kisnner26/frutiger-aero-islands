import { describe, expect, it } from 'vitest';
import { NOTES, pickNote } from '../src/features/editor/bottles';

describe('pickNote', () => {
  it('elige una nota existente y un premio entre 10 y 30', () => {
    for (const r of [0, 0.5, 0.999]) {
      const { note, reward } = pickNote(() => r);
      expect(NOTES).toContain(note);
      expect(reward).toBeGreaterThanOrEqual(10);
      expect(reward).toBeLessThanOrEqual(30);
    }
  });
});
