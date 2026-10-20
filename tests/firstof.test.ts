import { describe, expect, it } from 'vitest';
import { firstOf } from '../src/persistence/supabase';

describe('firstOf (isla como objeto o lista)', () => {
  it('acepta las dos formas que devuelve el servidor', () => {
    expect(firstOf({ id: 'a' })).toEqual({ id: 'a' });
    expect(firstOf([{ id: 'b' }])).toEqual({ id: 'b' });
    expect(firstOf([])).toBeUndefined();
    expect(firstOf(null)).toBeUndefined();
  });
});
