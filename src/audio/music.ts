/** fachada del sistema de audio: toda la música pasa por el motor de radio, sin reproductores paralelos. */
import { radio } from './radio/engine';

export type MusicState = 'detenida' | 'sonando' | 'sin-pista';

export const music = {
  subscribe: radio.subscribe,
  getState: (): MusicState => {
    const s = radio.getSnapshot().status;
    return s === 'sonando' ? 'sonando' : s === 'error' ? 'sin-pista' : 'detenida';
  },
  getVolume: () => radio.getSnapshot().volume,
  play: () => radio.play(),
  pause: () => radio.pause(),
  toggle: () => radio.toggle(),
  setVolume: (v: number) => radio.setVolume(v),
  /** salta a otra canción de la pista larga (solo con la estación personal). */
  next: () => radio.nextTrack(),
  /** verdadero solo si la persona dejó la radio encendida la última vez. */
  wantsMusic: () => radio.wantsMusic(),
  armFirstGesture: () => radio.armFirstGesture(),
};
