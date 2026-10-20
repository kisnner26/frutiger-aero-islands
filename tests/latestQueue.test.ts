import { describe, expect, it } from 'vitest';
import { createLatestQueue } from '../src/persistence/latestQueue';

describe('createLatestQueue', () => {
  it('serializa las escrituras y descarta estados intermedios pendientes', async () => {
    const written: number[] = [];
    let releaseFirst: (() => void) | null = null;
    const firstBlocked = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const enqueue = createLatestQueue(async (value: number) => {
      written.push(value);
      if (value === 1) await firstBlocked;
    });

    const first = enqueue(1);
    const second = enqueue(2);
    const third = enqueue(3);
    expect(written).toEqual([1]);

    releaseFirst!();
    await Promise.all([first, second, third]);
    expect(written).toEqual([1, 3]);
  });

  it('continúa con el siguiente lote después de un error', async () => {
    const written: number[] = [];
    const enqueue = createLatestQueue(async (value: number) => {
      written.push(value);
      if (value === 1) throw new Error('falló');
    });

    await expect(enqueue(1)).rejects.toThrow('falló');
    await expect(enqueue(2)).resolves.toBeUndefined();
    expect(written).toEqual([1, 2]);
  });
});
