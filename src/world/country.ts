/** país elegido por la persona: decide en qué zona del mundo aparece su isla. se guarda en este dispositivo y, con cuenta, en su perfil. */
import { useSyncExternalStore } from 'react';
import { findCountry } from './countries';

const KEY = 'frutiger-aero-islands:pais';
const SKIP_KEY = 'frutiger-aero-islands:pais:omitido';

let current: string | null = readLocal();
const listeners = new Set<() => void>();

function readLocal(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return findCountry(raw) ? (raw as string).toLowerCase() : null;
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export const countryStore = {
  get: (): string | null => current,
  set(code: string | null) {
    const valid = code && findCountry(code) ? code.toLowerCase() : null;
    current = valid;
    try {
      if (valid) window.localStorage.setItem(KEY, valid);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* sin almacenamiento: vale solo para esta sesión */
    }
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** "ahora no": no volver a preguntar durante esta sesión del navegador. */
  skippedThisSession(): boolean {
    try {
      return window.sessionStorage.getItem(SKIP_KEY) === '1';
    } catch {
      return false;
    }
  },
  skip() {
    try {
      window.sessionStorage.setItem(SKIP_KEY, '1');
    } catch {
      /* sin almacenamiento */
    }
    emit();
  },
};

export function useCountry(): string | null {
  return useSyncExternalStore(countryStore.subscribe, countryStore.get);
}
