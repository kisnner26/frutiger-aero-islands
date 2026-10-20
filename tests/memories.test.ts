import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LIMIT_TEXT, MEMORY_LIMITS, checkLimits, formatBytes, groupByDay, memoryFileName, type Memory } from '../src/memories/logic';
import { MemoryLimitError, addMemory, attachPhoto, hasKind, listMemories, removeMemory, usageOf } from '../src/memories/store';

const blob = (n: number) => new Blob([new Uint8Array(n)], { type: 'image/jpeg' });

describe('límites del álbum', () => {
  it('rechaza por cantidad, peso de foto y almacenamiento total', () => {
    expect(checkLimits({ count: 0, bytes: 0 }, { bytes: 1000 })).toBeNull();
    expect(checkLimits({ count: MEMORY_LIMITS.count, bytes: 0 }, { bytes: 10 })).toBe('cantidad');
    expect(checkLimits({ count: 1, bytes: 0 }, { bytes: MEMORY_LIMITS.photoBytes + 1 })).toBe('foto-grande');
    expect(checkLimits({ count: 1, bytes: MEMORY_LIMITS.bytes - 5 }, { bytes: 10 })).toBe('almacenamiento');
    expect(LIMIT_TEXT.cantidad).toMatch(/40/);
  });

  it('formatea tamaños y nombres de archivo', () => {
    expect(formatBytes(500)).toBe('500 b');
    expect(formatBytes(2048)).toBe('2 kb');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 mb');
    expect(memoryFileName({ kind: 'foto', at: new Date(2026, 9, 19, 23, 5).toISOString() })).toBe('isla-foto-2026-10-19-2305.jpg');
  });

  it('agrupa por día de más reciente a más antiguo', () => {
    const mk = (id: string, at: string): Memory => ({ id, kind: 'foto', at, text: '', bytes: 0, origin: 'local' });
    const g = groupByDay([mk('a', new Date(2026, 9, 18, 10).toISOString()), mk('b', new Date(2026, 9, 19, 9).toISOString()), mk('c', new Date(2026, 9, 19, 20).toISOString())]);
    expect(g).toHaveLength(2);
    expect(g[0].items.map((m) => m.id)).toEqual(['c', 'b']);
    expect(g[1].items.map((m) => m.id)).toEqual(['a']);
  });
});

describe('almacén de recuerdos (indexeddb)', () => {
  it('añade la foto a un recuerdo sin foto una sola vez', async () => {
    for (const m of await listMemories()) await removeMemory(m.id);
    const m = (await addMemory({ kind: 'creacion', text: 'empezaste tu isla' }, { unique: true }))!;
    expect(m.bytes).toBe(0);
    expect(await addMemory({ kind: 'creacion', text: 'otra vez' }, { unique: true })).toBeNull();
    expect(await listMemories()).toHaveLength(1);
    expect(await attachPhoto(m.id, blob(4000), 8, 8)).toBe(true);
    expect((await listMemories())[0]).toMatchObject({ bytes: 4000, width: 8 });
    expect(await attachPhoto(m.id, blob(10), 1, 1)).toBe(false);
    expect(await attachPhoto('no-existe', blob(10), 1, 1)).toBe(false);
    await removeMemory(m.id);
  });

  it('guarda, lista, detecta tipo y elimina', async () => {
    expect(await listMemories()).toEqual([]);
    const m = (await addMemory({ kind: 'creacion', text: 'empezaste tu isla', photo: blob(5000), width: 10, height: 10 }))!;
    await addMemory({ kind: 'foto', text: 'fotografía de tu isla', photo: blob(3000) });
    const all = await listMemories();
    expect(all).toHaveLength(2);
    expect(usageOf(all)).toEqual({ count: 2, bytes: 8000 });
    expect(await hasKind('creacion')).toBe(true);
    await removeMemory(m.id);
    expect(await hasKind('creacion')).toBe(false);
    expect(await listMemories()).toHaveLength(1);
  });

  it('respeta el tope de cantidad y el de peso sin guardar nada', async () => {
    for (const m of await listMemories()) await removeMemory(m.id);
    await expect(addMemory({ kind: 'foto', text: '', photo: blob(MEMORY_LIMITS.photoBytes + 1) })).rejects.toBeInstanceOf(MemoryLimitError);
    for (let i = 0; i < MEMORY_LIMITS.count; i++) await addMemory({ kind: 'foto', text: `f${i}`, photo: blob(100) });
    await expect(addMemory({ kind: 'foto', text: 'extra', photo: blob(100) })).rejects.toMatchObject({ problem: 'cantidad' });
    expect(await listMemories()).toHaveLength(MEMORY_LIMITS.count);
  });
});
