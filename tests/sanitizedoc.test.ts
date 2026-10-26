import { describe, expect, it } from 'vitest';
import { sanitizeDoc } from '../src/persistence/supabase';

describe('sanitizeDoc', () => {
  it('vuelve enteros los brillos y stats', () => {
    const d = sanitizeDoc({ objects: [], brillos: 12.6, maxLevel: 1, stats: { pops: 3.2, bestCombo: 4 } } as never);
    expect(d.brillos).toBe(12);
    expect(d.stats.pops).toBe(3);
  });
});

describe('sanitizeDoc objetos', () => {
  const o = (over: object) => ({ id: 'a', assetId: 'girasol', x: 10, y: 20, scale: 1, rotation: 0, ...over });
  it('corrige decimales, escala fuera de rango e ids repetidos y descarta lo desconocido', () => {
    const d = sanitizeDoc({
      objects: [o({ x: 10.6, scale: 0.5 }), o({ id: 'a' }), o({ assetId: 'inventado', id: 'b' }), o({ id: 'c', rotation: 7 })],
      brillos: 1, maxLevel: 1, stats: { pops: 0, bestCombo: 0 },
    } as never);
    expect(d.objects).toHaveLength(3);
    expect(d.objects[0].x).toBe(11);
    expect(d.objects[0].scale).toBe(0.7);
    expect(new Set(d.objects.map((x) => x.id)).size).toBe(3);
    expect(d.objects[2].rotation).toBe(0);
  });
});
