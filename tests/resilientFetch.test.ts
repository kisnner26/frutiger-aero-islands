import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** el módulo usa window.setTimeout; en node lo apuntamos al global. */
beforeEach(() => {
  vi.stubGlobal('window', globalThis);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('resilientFetch', () => {
  it('reintenta una lectura tras un fallo de red y devuelve la respuesta', async () => {
    const { resilientFetch } = await import('../src/net/resilientFetch');
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    spy.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const res = await resilientFetch('http://localhost/x');
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('reintenta una lectura ante un 503', async () => {
    const { resilientFetch } = await import('../src/net/resilientFetch');
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(new Response('', { status: 503 }));
    spy.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    expect((await resilientFetch('http://localhost/x')).status).toBe(200);
  });

  it('no repite una escritura que ya salió', async () => {
    const { resilientFetch } = await import('../src/net/resilientFetch');
    const spy = vi.spyOn(globalThis, 'fetch');
    spy.mockResolvedValueOnce(new Response('', { status: 503 }));
    const res = await resilientFetch('http://localhost/x', { method: 'POST', body: '{}' });
    expect(res.status).toBe(503);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('una lectura que no responde se corta por tiempo y no deja esperando para siempre', async () => {
    vi.useFakeTimers();
    try {
      const { resilientFetch } = await import('../src/net/resilientFetch');
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            (init as RequestInit).signal?.addEventListener('abort', () => reject((init as RequestInit).signal!.reason));
          }),
      );
      const result = resilientFetch('http://localhost/lento').then(() => 'respondio', () => 'fallo');
      await vi.advanceTimersByTimeAsync(80_000);
      expect(await result).toBe('fallo');
    } finally {
      vi.useRealTimers();
    }
  });
});
