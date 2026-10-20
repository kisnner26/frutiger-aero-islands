/** estado compartido entre el teléfono y la escena: modo cámara (interfaz oculta para encuadrar). */
let camera = false;
const listeners = new Set<() => void>();

export const phoneBus = {
  cameraMode: () => camera,
  setCamera(v: boolean) {
    if (camera === v) return;
    camera = v;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
