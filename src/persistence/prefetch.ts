import { isSupabaseConfigured } from './supabase';
import { listWorldIslands } from './world';
import { loadSnapshot } from './territory';

let done = false;

/** pide en segundo plano lo que necesita el mundo para que abra al instante (se hace una sola vez por visita). */
export function prefetchWorld() {
  if (done || !isSupabaseConfigured) return;
  done = true;
  const run = () => {
    void listWorldIslands().catch(() => undefined);
    void loadSnapshot().catch(() => undefined);
  };
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, o: { timeout: number }) => void }).requestIdleCallback;
  if (typeof idle === 'function') idle(run, { timeout: 2500 });
  else setTimeout(run, 800);
}
