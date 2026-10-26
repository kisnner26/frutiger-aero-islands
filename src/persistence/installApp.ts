import { useSyncExternalStore } from 'react';
import { tr } from '../i18n';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const standalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
};

if (typeof window !== 'undefined') {
  installed = standalone();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export type InstallState = 'instalada' | 'lista' | 'manual';

/** cómo instalarla en el navegador de esta persona: con un clic donde se puede, con pasos donde no (safari). */
export const installState = (): InstallState => (installed ? 'instalada' : deferred ? 'lista' : 'manual');
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useInstallState = () => useSyncExternalStore(subscribe, installState);

export function manualSteps(ua = navigator.userAgent): string {
  if (/iPhone|iPad|iPod/.test(ua)) return tr('toca compartir y elige "añadir a pantalla de inicio"', 'tap share and choose "add to home screen"');
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return tr('en safari: menú archivo > "añadir al dock"', 'in safari: file menu > "add to dock"');
  return tr('en el menú del navegador busca "instalar app" o "añadir a pantalla de inicio"', 'in the browser menu look for "install app" or "add to home screen"');
}

/** abre el diálogo del navegador; devuelve true si la persona aceptó. */
export async function install(): Promise<boolean> {
  if (!deferred) return false;
  const ev = deferred;
  deferred = null;
  emit();
  try {
    await ev.prompt();
    return (await ev.userChoice).outcome === 'accepted';
  } catch {
    return false;
  }
}
