import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

export interface SessionInfo {
  status: 'cargando' | 'sin-sesion' | 'con-sesion';
  email: string | null;
  username: string | null;
}

let state: SessionInfo = { status: supabase ? 'cargando' : 'sin-sesion', email: null, username: null };
const listeners = new Set<() => void>();
let started = false;

function set(next: SessionInfo) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadUsername(userId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle();
    return (data as { username?: string } | null)?.username ?? null;
  } catch {
    return null;
  }
}

async function apply(session: { user: { id: string; email?: string | null } } | null) {
  if (!session) return set({ status: 'sin-sesion', email: null, username: null });
  set({ status: 'con-sesion', email: session.user.email ?? null, username: state.username });
  const username = await loadUsername(session.user.id);
  set({ status: 'con-sesion', email: session.user.email ?? null, username });
  // el país del perfil es la fuente de verdad cuando existe
  void import('./country').then((m) => m.syncCountry()).catch(() => undefined);
}

function start() {
  if (started) return;
  // solo en desarrollo y sin backend: permite revisar la interfaz con sesión iniciada sin credenciales reales
  if (!supabase && import.meta.env.DEV) {
    started = true;
    try {
      const fake = window.localStorage.getItem('frutiger-aero-islands:dev-sesion');
      if (fake) set({ status: 'con-sesion', email: `${fake}@ejemplo.invalid`, username: fake });
    } catch {
      /* sin almacenamiento */
    }
    return;
  }
  if (!supabase) return;
  started = true;
  void supabase.auth.getSession().then(({ data }) => apply(data.session));
  supabase.auth.onAuthStateChange((_event, session) => void apply(session));
}

/** estado de la sesión compartido por toda la aplicación (portada, menú de inicio, cuenta). */
export function useSession(): SessionInfo {
  start();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
  set({ status: 'sin-sesion', email: null, username: null });
}
