import type { IslandScene } from './IslandScene';

/** registro de la escena de isla activa, para que el teléfono (cámara) pueda usarla sin acoplarse al editor. */
let active: IslandScene | null = null;
const listeners = new Set<() => void>();

export const sceneBridge = {
  get: () => active,
  set(scene: IslandScene | null) {
    active = scene;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
