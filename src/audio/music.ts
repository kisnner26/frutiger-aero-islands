export type MusicState = 'detenida' | 'sonando' | 'sin-pista';

const PREFS_KEY = 'frutiger-aero-islands:musica';
const SRC = `${import.meta.env.BASE_URL}audio/soundtrack.mp3`;

interface Prefs {
  on: boolean;
  volume: number;
}

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { on: p.on !== false, volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : 0.5 };
    }
  } catch {
    /* sin almacenamiento */
  }
  return { on: true, volume: 0.5 };
}

function writePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento */
  }
}

class Music {
  private audio: HTMLAudioElement | null = null;
  private prefs = readPrefs();
  private state: MusicState = 'detenida';
  private listeners = new Set<() => void>();

  private ensure(): HTMLAudioElement {
    if (!this.audio) {
      const a = new Audio();
      a.loop = true;
      a.preload = 'none';
      a.volume = this.prefs.volume;
      a.addEventListener('error', () => this.set('sin-pista'));
      a.addEventListener('playing', () => this.set('sonando'));
      a.addEventListener('pause', () => {
        if (this.state !== 'sin-pista') this.set('detenida');
      });
      a.src = SRC;
      this.audio = a;
    }
    return this.audio;
  }

  private set(state: MusicState) {
    this.state = state;
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getState = () => this.state;
  getVolume = () => this.prefs.volume;
  wantsMusic = () => this.prefs.on;

  /** debe llamarse desde un gesto del usuario. */
  async play(): Promise<void> {
    this.prefs = { ...this.prefs, on: true };
    writePrefs(this.prefs);
    try {
      await this.ensure().play();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) this.set('sin-pista');
    }
  }

  pause() {
    this.prefs = { ...this.prefs, on: false };
    writePrefs(this.prefs);
    this.audio?.pause();
    if (this.state === 'sonando') this.set('detenida');
  }

  toggle() {
    return this.state === 'sonando' ? this.pause() : this.play();
  }

  setVolume(v: number) {
    this.prefs = { ...this.prefs, volume: Math.min(1, Math.max(0, v)) };
    writePrefs(this.prefs);
    if (this.audio) this.audio.volume = this.prefs.volume;
    this.listeners.forEach((l) => l());
  }

  /** arranca en el primer gesto si la preferencia lo permite. */
  armFirstGesture() {
    const start = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      if (this.prefs.on && this.state === 'detenida') void this.play();
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }
}

export const music = new Music();
