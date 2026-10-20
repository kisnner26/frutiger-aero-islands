/** porcentaje de planeta restaurado por la comunidad, compartido por el editor, el mundo y los hitos. */
import { useSyncExternalStore } from 'react';
import { isSupabaseConfigured } from '../persistence/supabase';
import { loadRestoration } from '../persistence/territory';

const KEY = 'frutiger-aero-islands:restauracion';
let percent = read();
const listeners = new Set<() => void>();

function read(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  } catch {
    return 0;
  }
}

export const restorationStore = {
  get: () => percent,
  set(next: number) {
    const v = Math.max(0, Math.min(100, next));
    if (v === percent) return;
    percent = v;
    try {
      window.localStorage.setItem(KEY, String(v));
    } catch {
      /* sin almacenamiento */
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async refresh() {
    if (!isSupabaseConfigured) return;
    const r = await loadRestoration().catch(() => null);
    if (r) restorationStore.set(r.percent);
  },
};

export const useRestoration = () => useSyncExternalStore(restorationStore.subscribe, restorationStore.get);
