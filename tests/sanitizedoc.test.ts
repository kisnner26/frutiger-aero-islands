import { describe, expect, it } from 'vitest';
import { sanitizeDoc } from '../src/persistence/supabase';

describe('sanitizeDoc', () => {
  it('vuelve enteros los brillos y stats', () => {
    const d = sanitizeDoc({ objects: [], brillos: 12.6, maxLevel: 1, stats: { pops: 3.2, bestCombo: 4 } } as never);
    expect(d.brillos).toBe(12);
    expect(d.stats.pops).toBe(3);
  });
});
