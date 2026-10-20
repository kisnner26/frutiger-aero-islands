import { useSyncExternalStore } from 'react';
import { myProfileRow } from './profileRow';
import { supabase } from './supabase';

export interface SessionInfo {
  status: 'cargando' | 'sin-sesion' | 'con-sesion';
  email: string | null;
  username: string | null;
}

let state: SessionInfo = { status: supabase ? 'cargando' : 'sin-sesion', email: null, username: null };
const listeners = new Set<() => void>();
let started = false;
let resolvedUserId: string | null = null;
let pendingApply: { userId: string | null; promise: Promise<void> } | null = null;
let applyGeneration = 0;

function set(next: SessionInfo) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadUsername(userId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    return (await myProfileRow(userId))?.username ?? null;
  } catch {
    return null;
  }
}

async function applySession(session: { user: { id: string; email?: string | null } } | null, generation: number) {
  if (!session) {
    resolvedUserId = null;
    void import('../avatar/store').then((m) => m.avatarStore.setAccount(null)).catch(() => undefined);
    set({ status: 'sin-sesion', email: null, username: null });
    return;
  }
  if (resolvedUserId === session.user.id && state.status === 'con-sesion') {
    if (state.email !== (session.user.email ?? null)) set({ ...state, email: session.user.email ?? null });
    return;
  }
  set({ status: 'con-sesion', email: session.user.email ?? null, username: state.username });
  const username = await loadUsername(session.user.id);
  if (generation !== applyGeneration) return;
  resolvedUserId = session.user.id;
  set({ status: 'con-sesion', email: session.user.email ?? null, username });
  // el país del perfil es la fuente de verdad cuando existe
  void import('./country').then((m) => m.syncCountry()).catch(() => undefined);
  void import('../avatar/store').then((m) => m.avatarStore.setAccount(session.user.id)).then(() => import('./avatar')).then((m) => m.syncAvatar()).catch(() => undefined);
}

function apply(session: { user: { id: string; email?: string | null } } | null): Promise<void> {
  const userId = session?.user.id ?? null;
  if (pendingApply?.userId === userId) return pendingApply.promise;
  const generation = ++applyGeneration;
  const promise = applySession(session, generation).finally(() => {
    if (pendingApply?.promise === promise) pendingApply = null;
  });
  pendingApply = { userId, promise };
  return promise;
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
  // se difiere un instante: llamar al servidor dentro de este aviso puede quedarse esperando el candado de la propia autenticación
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => void apply(session), 0);
  });
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
