/** estado compartido entre el teléfono y la escena: cámara y solicitudes desde otros módulos. */
export type PhoneApp = 'inicio' | 'radio' | 'camara' | 'album';

let camera = false;
let requestedApp: PhoneApp | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const phoneBus = {
  cameraMode: () => camera,
  setCamera(v: boolean) {
    if (camera === v) return;
    camera = v;
    notify();
  },
  phoneApp: () => requestedApp,
  open(app: PhoneApp = 'inicio') {
    requestedApp = app;
    notify();
  },
  consumeOpen() {
    if (requestedApp === null) return;
    requestedApp = null;
    notify();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
