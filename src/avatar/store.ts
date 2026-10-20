import { useSyncExternalStore } from 'react';
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarSpec } from './model';

const KEY = 'frutiger-aero-islands:avatar';
let accountId: string | null = null;

function key(): string {
  return accountId ? `${KEY}:${accountId}` : `${KEY}:guest`;
}

function read(): AvatarSpec | null {
  try {
    const raw = window.localStorage.getItem(key());
    return raw ? normalizeAvatar(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let saved: AvatarSpec | null = read();
const listeners = new Set<() => void>();

/** personaje elegido por cuenta; nunca se hereda desde otro usuario del mismo navegador. */
export const avatarStore = {
  get: (): AvatarSpec => saved ?? DEFAULT_AVATAR,
  hasCustom: (): boolean => saved !== null,
  set(spec: AvatarSpec) {
    saved = normalizeAvatar(spec);
    try {
      window.localStorage.setItem(key(), JSON.stringify(saved));
    } catch {
      /* sin almacenamiento: vale solo para esta sesión */
    }
    listeners.forEach((l) => l());
  },
  setAccount(userId: string | null) {
    if (accountId === userId) return;
    accountId = userId;
    saved = read();
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAvatar(): AvatarSpec {
  return useSyncExternalStore(avatarStore.subscribe, avatarStore.get);
}
