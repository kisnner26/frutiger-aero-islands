interface Batch<T> {
  value: T;
  waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }>;
}

/**
 * Ejecuta una sola escritura a la vez. Si llegan más cambios durante esa escritura,
 * conserva únicamente el último y resuelve juntos los estados intermedios.
 */
export function createLatestQueue<T>(write: (value: T) => Promise<void>) {
  let running = false;
  let pending: Batch<T> | null = null;

  const pump = async () => {
    if (running) return;
    running = true;
    while (pending) {
      const batch = pending;
      pending = null;
      try {
        await write(batch.value);
        batch.waiters.forEach(({ resolve }) => resolve());
      } catch (error) {
        batch.waiters.forEach(({ reject }) => reject(error));
      }
    }
    running = false;
  };

  return (value: T): Promise<void> =>
    new Promise((resolve, reject) => {
      if (pending) {
        pending.value = value;
        pending.waiters.push({ resolve, reject });
      } else {
        pending = { value, waiters: [{ resolve, reject }] };
      }
      void pump();
    });
}
