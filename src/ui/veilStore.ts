/** velo de transición entre vistas: se muestra al abrir la isla o el mundo y se retira cuando la escena está lista. */
export interface VeilState {
  visible: boolean;
  text: string;
  /** 'viaje': un velero cruza el mar (visitas a otras islas). */
  kind: 'normal' | 'viaje';
  /** cambia en cada show() para reiniciar la animación. */
  key: number;
}

const MIN_MS = 750;
const MAX_MS = 9000;

let state: VeilState = { visible: false, text: '', kind: 'normal', key: 0 };
let shownAt = 0;
let hideTimer = 0;
let failSafe = 0;
const listeners = new Set<() => void>();

function set(next: VeilState) {
  state = next;
  listeners.forEach((l) => l());
}

export const veil = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  show(text: string, kind: VeilState['kind'] = 'normal') {
    window.clearTimeout(hideTimer);
    window.clearTimeout(failSafe);
    shownAt = performance.now();
    set({ visible: true, text, kind, key: state.key + 1 });
    failSafe = window.setTimeout(() => veil.hide(true), MAX_MS);
  },
  /** retira el velo respetando un mínimo de visibilidad para que la transición se aprecie. */
  hide(force = false) {
    if (!state.visible) return;
    window.clearTimeout(hideTimer);
    const wait = force ? 0 : Math.max(0, MIN_MS - (performance.now() - shownAt));
    hideTimer = window.setTimeout(() => {
      window.clearTimeout(failSafe);
      set({ ...state, visible: false });
    }, wait);
  },
};
