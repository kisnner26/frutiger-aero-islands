import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cached, clearAll, invalidate, peek } from '../src/persistence/fastcache';

beforeEach(() => clearAll());

describe('caché de lecturas', () => {
  it('junta llamadas simultáneas en una sola petición', async () => {
    const f = vi.fn(async () => 7);
    const [a, b, c] = await Promise.all([cached('k', { ttl: 1000 }, f), cached('k', { ttl: 1000 }, f), cached('k', { ttl: 1000 }, f)]);
    expect([a, b, c]).toEqual([7, 7, 7]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('reutiliza el resultado mientras es fresco y vuelve a pedir al caducar o invalidar', async () => {
    let n = 0;
    const f = async () => ++n;
    expect(await cached('k', { ttl: 60_000 }, f)).toBe(1);
    expect(await cached('k', { ttl: 60_000 }, f)).toBe(1);
    invalidate('k');
    expect(await cached('k', { ttl: 60_000 }, f)).toBe(2);
  });

  it('con stale devuelve el valor viejo al instante y actualiza detrás', async () => {
    let n = 0;
    const f = async () => ++n;
    await cached('k', { ttl: 0 }, f);
    const quick = await cached('k', { ttl: 0, stale: true }, f);
    expect(quick).toBe(1);
    await new Promise((r) => setTimeout(r, 5));
    expect(peek('k')).toBe(2);
  });

  it('un error no deja la petición atascada', async () => {
    await expect(cached('e', { ttl: 1000 }, async () => Promise.reject(new Error('x')))).rejects.toThrow();
    expect(await cached('e', { ttl: 1000 }, async () => 5)).toBe(5);
  });
});
