import { useSyncExternalStore } from 'react';
import { DEFAULT_AVATAR, normalizeAvatar, type AvatarSpec } from './model';

const KEY = 'frutiger-aero-islands:avatar';

function read(): AvatarSpec | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalizeAvatar(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

let saved: AvatarSpec | null = read();
const listeners = new Set<() => void>();

/** personaje elegido en este dispositivo; sin elección se muestra el personaje por defecto. */
export const avatarStore = {
  get: (): AvatarSpec => saved ?? DEFAULT_AVATAR,
  hasCustom: (): boolean => saved !== null,
  set(spec: AvatarSpec) {
    saved = normalizeAvatar(spec);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* sin almacenamiento: vale solo para esta sesión */
    }
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
