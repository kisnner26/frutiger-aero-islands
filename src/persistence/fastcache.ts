/**
 * caché de lecturas del servidor: evita repetir la misma consulta (en vuelo o reciente) y muestra
 * enseguida el último resultado mientras se actualiza en segundo plano.
 */
interface Entry<T> {
  value?: T;
  at: number;
  inflight?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

export interface CacheOptions {
  /** hasta cuándo el resultado se considera fresco (ms). */
  ttl: number;
  /** si ya hay un resultado viejo, devolverlo al instante y refrescar detrás (stale-while-revalidate). */
  stale?: boolean;
}

export function cached<T>(key: string, opts: CacheOptions, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const e = (store.get(key) as Entry<T> | undefined) ?? { at: 0 };
  store.set(key, e);
  const fresh = e.value !== undefined && now - e.at < opts.ttl;
  if (fresh) return Promise.resolve(e.value as T);
  const run = () => {
    if (!e.inflight) {
      e.inflight = fetcher()
        .then((v) => {
          e.value = v;
          e.at = Date.now();
          return v;
        })
        .finally(() => {
          e.inflight = undefined;
        });
    }
    return e.inflight;
  };
  if (opts.stale && e.value !== undefined) {
    void run().catch(() => undefined);
    return Promise.resolve(e.value as T);
  }
  return run();
}

/** último valor conocido sin pedir nada (para pintar al instante). */
export function peek<T>(key: string): T | undefined {
  return (store.get(key) as Entry<T> | undefined)?.value;
}

export function invalidate(prefix: string) {
  for (const [k, e] of store) if (k.startsWith(prefix)) {
    e.at = 0;
  }
}

export function clearAll() {
  store.clear();
}

/** repite una tarea solo mientras la pestaña está visible y la ejecuta al volver. devuelve la función para parar. */
export function everyWhileVisible(fn: () => void, ms: number): () => void {
  let timer = 0;
  const start = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      if (!document.hidden) fn();
    }, ms);
  };
  const onVisible = () => {
    if (!document.hidden) fn();
  };
  start();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
