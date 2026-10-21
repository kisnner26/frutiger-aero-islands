/** mediciones con User Timing: se leen con `window.__perf()` en la consola y no cuestan nada cuando nadie las mira. */
export function timed<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    performance.measure(name, { start, end: performance.now() });
  }
}

export async function timedAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    performance.measure(name, { start, end: performance.now() });
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as { __perf: () => Array<[string, number, number]> }).__perf = () =>
    performance.getEntriesByType('measure').map((m) => [m.name, Math.round(m.startTime), Math.round(m.duration)] as [string, number, number]);
}
