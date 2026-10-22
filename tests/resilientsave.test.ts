import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { calls: [] as number[], failures: [] as unknown[], serverRevision: 7 };
vi.mock('../src/persistence/supabase', () => ({
  saveIsland: vi.fn(async (_id: string, revision: number) => {
    state.calls.push(revision);
    const f = state.failures.shift();
    if (f) throw f;
    return revision + 1;
  }),
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { revision: state.serverRevision }, error: null }) }) }) }),
    auth: { refreshSession: vi.fn(async () => ({ error: null })) },
  },
}));

import { describeSaveError, saveIslandResilient } from '../src/persistence/resilientSave';

const doc = { objects: [], brillos: 1, maxLevel: 1, stats: { pops: 0, bestCombo: 0 } } as never;

describe('guardado de la isla', () => {
  beforeEach(() => {
    state.calls = [];
    state.failures = [];
    vi.stubGlobal('window', globalThis);
  });

  it('si la revisión quedó desfasada, la vuelve a leer y guarda', async () => {
    state.failures = [{ code: '40001', message: 'conflicto de edición: recarga la isla antes de guardar' }];
    const rev = { current: 0 };
    await saveIslandResilient('i', rev, doc);
    expect(state.calls).toEqual([0, 7]);
    expect(rev.current).toBe(8);
  });

  it('con la sesión caducada la renueva y reintenta', async () => {
    state.failures = [{ code: '42501', message: 'sesión requerida' }];
    const rev = { current: 3 };
    await saveIslandResilient('i', rev, doc);
    expect(state.calls).toEqual([3, 3]);
  });

  it('un objeto inválido no se reintenta y explica el motivo', async () => {
    state.failures = [{ code: '22023', message: 'uno de los objetos no es válido' }];
    await expect(saveIslandResilient('i', { current: 0 }, doc)).rejects.toBeTruthy();
    expect(state.calls.length).toBe(1);
    expect(describeSaveError({ code: '22023', message: 'uno de los objetos no es válido' })).toBe('un objeto no es válido');
  });
});
