import { barSeconds, BEATS_PER_BAR, midiToHz, planBar, type NoteEvent } from './generator';
import { loadPrefs, savePrefs, type RadioPrefs } from './prefs';
import { AMBIENCE_IDS, PERSONAL_TRACK, STATIONS, findStation, type AmbienceId, type StationId, type TrackInfo } from './stations';

export type RadioStatus = 'detenida' | 'cargando' | 'sonando' | 'interrumpida' | 'error';

export interface RadioSnapshot {
  status: RadioStatus;
  station: StationId;
  stationName: string;
  title: string;
  author: string;
  note: string | null;
  trackIndex: number;
  trackCount: number;
  volume: number;
  ambience: Record<AmbienceId, boolean>;
  ambienceLevel: number;
  personalAvailable: boolean;
  message: string | null;
}

const PERSONAL_URL = `${import.meta.env.BASE_URL}audio/soundtrack.mp3`;
const FADE = 1.3;

interface Session {
  track: TrackInfo;
  out: GainNode;
  bar: number;
  nextTime: number;
  timer: number;
}

interface AmbLayer {
  gain: GainNode;
  stop: () => void;
}

class RadioEngine {
  private prefs: RadioPrefs = loadPrefs();
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private analyser!: AnalyserNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private reverbIn!: GainNode;
  private noise!: AudioBuffer;
  private session: Session | null = null;
  private layers = new Map<AmbienceId, AmbLayer>();
  private personal: { el: HTMLAudioElement; src: MediaElementAudioSourceNode | null; gain: GainNode | null } | null = null;
  private listeners = new Set<() => void>();
  private status: RadioStatus = 'detenida';
  private message: string | null = null;
  private personalAvailable = false;
  private personalChecked = false;
  private snap: RadioSnapshot;

  constructor() {
    this.snap = this.makeSnapshot();
  }

  /* ---------- suscripción ---------- */

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = () => this.snap;

  private emit() {
    this.snap = this.makeSnapshot();
    savePrefs(this.prefs);
    this.listeners.forEach((l) => l());
  }

  private makeSnapshot(): RadioSnapshot {
    const st = this.prefs.station;
    if (st === 'personal') {
      return {
        status: this.status,
        station: st,
        stationName: 'personal',
        title: PERSONAL_TRACK.title,
        author: PERSONAL_TRACK.author,
        note: PERSONAL_TRACK.note,
        trackIndex: 0,
        trackCount: 1,
        volume: this.prefs.volume,
        ambience: { ...this.prefs.ambience },
        ambienceLevel: this.prefs.ambienceLevel,
        personalAvailable: this.personalAvailable,
        message: this.message,
      };
    }
    const station = findStation(st) ?? STATIONS[0];
    const idx = this.prefs.track[station.id] ?? 0;
    const track = station.tracks[idx] ?? station.tracks[0];
    return {
      status: this.status,
      station: station.id,
      stationName: station.name,
      title: track.title,
      author: track.author,
      note: 'música generativa original creada con web audio',
      trackIndex: idx,
      trackCount: station.tracks.length,
      volume: this.prefs.volume,
      ambience: { ...this.prefs.ambience },
      ambienceLevel: this.prefs.ambienceLevel,
      personalAvailable: this.personalAvailable,
      message: this.message,
    };
  }

  private setStatus(status: RadioStatus, message: string | null = null) {
    this.status = status;
    this.message = message;
    this.emit();
  }

  /* ---------- contexto de audio ---------- */

  /** debe llamarse desde un gesto del usuario la primera vez. */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('sin webaudio');
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.master.connect(comp).connect(this.analyser).connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.prefs.volume;
      this.musicBus.connect(this.master);
      this.ambBus = ctx.createGain();
      this.ambBus.gain.value = 1;
      this.ambBus.connect(this.master);
      this.reverbIn = ctx.createGain();
      const conv = ctx.createConvolver();
      conv.buffer = this.impulse(ctx, 2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.38;
      this.reverbIn.connect(conv).connect(wet).connect(this.musicBus);
      this.noise = this.makeNoise(ctx, 3);
      ctx.addEventListener('statechange', () => {
        if (this.status === 'sonando' && ctx.state !== 'running') this.setStatus('interrumpida', 'el navegador detuvo el audio. toca reproducir para continuar.');
      });
      return ctx;
    } catch {
      this.setStatus('error', 'este navegador no permite audio. prueba con otro.');
      return null;
    }
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  private makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.97 * b0 + 0.03 * w; // ruido rosado barato
      d[i] = w * 0.5 + b0 * 4;
    }
    return buf;
  }

  /* ---------- música ---------- */

  private currentTrack(): TrackInfo | null {
    if (this.prefs.station === 'personal') return null;
    const st = findStation(this.prefs.station) ?? STATIONS[0];
    return st.tracks[this.prefs.track[st.id] ?? 0] ?? st.tracks[0];
  }

  private startSession(track: TrackInfo) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);
    out.connect(this.musicBus);
    out.connect(this.reverbIn);
    const s: Session = { track, out, bar: 0, nextTime: ctx.currentTime + 0.1, timer: 0 };
    s.timer = window.setInterval(() => this.pump(s), 100);
    this.session = s;
    this.pump(s);
  }

  private stopSession(fast = false) {
    const s = this.session;
    const ctx = this.ctx;
    if (!s || !ctx) return;
    this.session = null;
    window.clearInterval(s.timer);
    const t = ctx.currentTime;
    const fade = fast ? 0.15 : FADE;
    s.out.gain.cancelScheduledValues(t);
    s.out.gain.setValueAtTime(Math.max(s.out.gain.value, 0.0001), t);
    s.out.gain.linearRampToValueAtTime(0.0001, t + fade);
    window.setTimeout(() => s.out.disconnect(), (fade + 4) * 1000);
  }

  private pump(s: Session) {
    const ctx = this.ctx;
    if (!ctx || this.session !== s) return;
    const spb = 60 / s.track.bpm;
    while (s.nextTime < ctx.currentTime + 1.4) {
      for (const e of planBar(s.track, s.bar)) this.voice(s, e, s.nextTime + e.beat * spb, spb);
      s.nextTime += barSeconds(s.track);
      s.bar++;
    }
  }

  private voice(s: Session, e: NoteEvent, when: number, spb: number) {
    const ctx = this.ctx!;
    const dur = e.dur * spb;
    const g = ctx.createGain();
    g.connect(s.out);
    const stopAt = (nodes: Array<OscillatorNode | AudioBufferSourceNode>, t: number) => nodes.forEach((n) => n.stop(t));
    if (e.kind === 'shaker') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6500;
      g.gain.setValueAtTime(e.vel * 0.5, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
      src.connect(hp).connect(g);
      src.start(when, Math.random() * 2);
      stopAt([src], when + 0.1);
      return;
    }
    const f = midiToHz(e.midi);
    const make = (type: OscillatorType, freq: number, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      return o;
    };
    if (e.kind === 'pad') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = s.track.padCutoff;
      const a = make('triangle', f, -5);
      const b = make('sine', f, 6);
      a.connect(lp);
      b.connect(lp);
      lp.connect(g);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(e.vel * 0.3, when + Math.min(1.4, dur * 0.4));
      g.gain.linearRampToValueAtTime(0.0001, when + dur + 0.8);
      a.start(when);
      b.start(when);
      stopAt([a, b], when + dur + 1);
    } else if (e.kind === 'bass') {
      const o = make('sine', f);
      o.connect(g);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(e.vel * 0.34, when + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when);
      stopAt([o], when + dur + 0.1);
    } else if (e.kind === 'pluck') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3600, when);
      lp.frequency.exponentialRampToValueAtTime(700, when + dur);
      const o = make('triangle', f);
      o.connect(lp).connect(g);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(e.vel * 0.42, when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 1.6);
      o.start(when);
      stopAt([o], when + dur * 1.7);
    } else {
      // campana: fundamental más parciales inarmónicos
      const parts: Array<[number, number]> = [[1, 1], [2.76, 0.35], [5.4, 0.14]];
      const nodes: OscillatorNode[] = [];
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(e.vel * 0.34, when + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      for (const [mul, amp] of parts) {
        const pg = ctx.createGain();
        pg.gain.value = amp;
        const o = make('sine', f * mul);
        o.connect(pg).connect(g);
        o.start(when);
        nodes.push(o);
      }
      stopAt(nodes, when + dur + 0.1);
    }
  }

  /* ---------- ambientes ---------- */

  private applyAmbience() {
    const ctx = this.ctx;
    if (!ctx) return;
    const playing = this.status === 'sonando';
    for (const id of AMBIENCE_IDS) {
      const want = playing && this.prefs.ambience[id];
      const layer = this.layers.get(id);
      if (want && !layer) this.startLayer(id);
      else if (!want && layer) this.stopLayer(id);
      else if (layer) layer.gain.gain.linearRampToValueAtTime(this.layerGain(id), ctx.currentTime + 0.4);
    }
  }

  private layerGain(id: AmbienceId): number {
    const base: Record<AmbienceId, number> = { lluvia: 0.5, olas: 0.7, aves: 0.45, burbujas: 0.5 };
    return base[id] * this.prefs.ambienceLevel;
  }

  private startLayer(id: AmbienceId) {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.layerGain(id), ctx.currentTime + 1.6);
    gain.connect(this.ambBus);
    const stops: Array<() => void> = [];
    const loopNoise = () => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      src.start(0, Math.random() * 2);
      stops.push(() => src.stop());
      return src;
    };
    if (id === 'lluvia') {
      const src = loopNoise();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 0.35;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      src.connect(bp).connect(hp).connect(gain);
    } else if (id === 'olas') {
      const src = loopNoise();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 650;
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const depth = ctx.createGain();
      depth.gain.value = 0.45;
      lfo.connect(depth).connect(swell.gain);
      lfo.start();
      stops.push(() => lfo.stop());
      src.connect(lp).connect(swell).connect(gain);
    } else {
      const spawn = () => {
        if (!this.layers.has(id)) return;
        const t = ctx.currentTime + 0.02;
        if (id === 'aves') {
          const n = 2 + Math.floor(Math.random() * 3);
          const base = 2200 + Math.random() * 1600;
          for (let i = 0; i < n; i++) {
            const o = ctx.createOscillator();
            o.type = 'sine';
            const g = ctx.createGain();
            const at = t + i * 0.16;
            o.frequency.setValueAtTime(base, at);
            o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.4), at + 0.1);
            g.gain.setValueAtTime(0.0001, at);
            g.gain.linearRampToValueAtTime(0.5, at + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
            o.connect(g).connect(gain);
            o.start(at);
            o.stop(at + 0.16);
          }
        } else {
          const o = ctx.createOscillator();
          o.type = 'sine';
          const g = ctx.createGain();
          const f0 = 320 + Math.random() * 380;
          o.frequency.setValueAtTime(f0, t);
          o.frequency.exponentialRampToValueAtTime(f0 * 2.1, t + 0.07);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.55, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
          o.connect(g).connect(gain);
          o.start(t);
          o.stop(t + 0.14);
        }
        timer = window.setTimeout(spawn, (id === 'aves' ? 1800 + Math.random() * 3600 : 350 + Math.random() * 1700));
      };
      let timer = window.setTimeout(spawn, 400);
      stops.push(() => window.clearTimeout(timer));
    }
    this.layers.set(id, { gain, stop: () => stops.forEach((s) => s()) });
  }

  private stopLayer(id: AmbienceId) {
    const layer = this.layers.get(id);
    const ctx = this.ctx;
    if (!layer || !ctx) return;
    this.layers.delete(id);
    const t = ctx.currentTime;
    layer.gain.gain.cancelScheduledValues(t);
    layer.gain.gain.setValueAtTime(Math.max(layer.gain.gain.value, 0.0001), t);
    layer.gain.gain.linearRampToValueAtTime(0.0001, t + 1.2);
    window.setTimeout(() => {
      layer.stop();
      layer.gain.disconnect();
    }, 1500);
  }

  /* ---------- pista personal opcional ---------- */

  async checkPersonal(): Promise<void> {
    if (this.personalChecked) return;
    this.personalChecked = true;
    try {
      const r = await fetch(PERSONAL_URL, { method: 'HEAD' });
      const type = r.headers.get('content-type') ?? '';
      this.personalAvailable = r.ok && type.startsWith('audio');
    } catch {
      this.personalAvailable = false;
    }
    if (!this.personalAvailable && this.prefs.station === 'personal') this.prefs.station = 'acuatico';
    this.emit();
  }

  private async startPersonal(): Promise<void> {
    const ctx = this.ctx!;
    if (!this.personal) {
      const el = new Audio();
      el.loop = true;
      el.preload = 'none';
      el.crossOrigin = 'anonymous';
      el.src = PERSONAL_URL;
      el.addEventListener('error', () => {
        if (this.prefs.station === 'personal') this.setStatus('error', 'no se pudo cargar la pista personal.');
      });
      this.personal = { el, src: null, gain: null };
    }
    const p = this.personal;
    if (!p.src) {
      p.src = ctx.createMediaElementSource(p.el);
      p.gain = ctx.createGain();
      p.src.connect(p.gain).connect(this.musicBus);
    }
    p.gain!.gain.cancelScheduledValues(ctx.currentTime);
    p.gain!.gain.setValueAtTime(0.0001, ctx.currentTime);
    p.gain!.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);
    await p.el.play();
  }

  private stopPersonal(fast = false) {
    const p = this.personal;
    const ctx = this.ctx;
    if (!p || !ctx || !p.gain) return;
    const fade = fast ? 0.15 : FADE;
    p.gain.gain.cancelScheduledValues(ctx.currentTime);
    p.gain.gain.setValueAtTime(Math.max(p.gain.gain.value, 0.0001), ctx.currentTime);
    p.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
    window.setTimeout(() => {
      if (this.status !== 'sonando' || this.prefs.station !== 'personal') p.el.pause();
    }, fade * 1000 + 50);
  }

  /* ---------- control ---------- */

  async play(): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.prefs.consent = true;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {
      this.setStatus('error', 'no se pudo iniciar el audio.');
      return;
    }
    if (this.status === 'sonando') return;
    if (this.session || (this.personal && !this.personal.el.paused)) {
      // reanudar tras una interrupción del navegador: la música sigue montada
      this.setStatus('sonando');
      this.applyAmbience();
      return;
    }
    this.musicBus.gain.setTargetAtTime(this.prefs.volume, ctx.currentTime, 0.05);
    if (this.prefs.station === 'personal') {
      this.setStatus('cargando');
      try {
        await this.startPersonal();
      } catch {
        this.setStatus('error', 'no se pudo reproducir la pista personal.');
        return;
      }
    } else {
      const track = this.currentTrack();
      if (track) this.startSession(track);
    }
    this.setStatus('sonando');
    this.applyAmbience();
  }

  pause() {
    this.prefs.consent = false;
    this.stopSession();
    this.stopPersonal();
    this.status = 'detenida';
    this.message = null;
    this.applyAmbience();
    this.emit();
  }

  toggle(): Promise<void> {
    return this.status === 'sonando' || this.status === 'cargando' ? Promise.resolve(this.pause()) : this.play();
  }

  /** cambia de emisora; si suena, hace un fundido cruzado. */
  async setStation(id: StationId) {
    if (id === this.prefs.station) return;
    if (id === 'personal' && !this.personalAvailable) return;
    const wasPlaying = this.status === 'sonando';
    this.prefs.station = id;
    if (wasPlaying) await this.retune();
    else this.emit();
  }

  async next(delta = 1) {
    const st = this.prefs.station;
    if (st === 'personal') return;
    const station = findStation(st)!;
    const n = station.tracks.length;
    this.prefs.track[st] = (((this.prefs.track[st] ?? 0) + delta) % n + n) % n;
    if (this.status === 'sonando') await this.retune();
    else this.emit();
  }

  prev() {
    return this.next(-1);
  }

  private async retune() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopSession();
    this.stopPersonal();
    if (this.prefs.station === 'personal') {
      try {
        await this.startPersonal();
      } catch {
        this.setStatus('error', 'no se pudo reproducir la pista personal.');
        return;
      }
    } else {
      const track = this.currentTrack();
      if (track) this.startSession(track);
    }
    this.status = 'sonando';
    this.message = null;
    this.emit();
  }

  setVolume(v: number) {
    this.prefs.volume = Math.min(1, Math.max(0, v));
    if (this.ctx) this.musicBus.gain.setTargetAtTime(this.prefs.volume, this.ctx.currentTime, 0.04);
    this.emit();
  }

  setAmbience(id: AmbienceId, on: boolean) {
    this.prefs.ambience[id] = on;
    this.applyAmbience();
    this.emit();
  }

  setAmbienceLevel(v: number) {
    this.prefs.ambienceLevel = Math.min(1, Math.max(0, v));
    this.applyAmbience();
    this.emit();
  }

  /** solo reanuda con el primer gesto si el usuario dejó la radio encendida la última vez. */
  armFirstGesture(): () => void {
    const start = () => {
      off();
      if (this.prefs.consent && this.status === 'detenida') void this.play();
    };
    const off = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return off;
  }

  wantsMusic(): boolean {
    return this.prefs.consent;
  }

  /** nivel instantáneo 0–1 para el visualizador. */
  levels(bins = 14): number[] {
    if (!this.analyser || this.status !== 'sonando') return new Array(bins).fill(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const out: number[] = [];
    const step = Math.max(1, Math.floor(data.length / bins));
    for (let i = 0; i < bins; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) sum += data[i * step + j] ?? 0;
      out.push(sum / step / 255);
    }
    return out;
  }

  /** estado interno para pruebas en navegador. */
  debug() {
    const lv = this.levels(8);
    return { ctx: this.ctx?.state ?? 'sin-contexto', time: this.ctx?.currentTime ?? 0, status: this.status, level: Math.max(0, ...lv), layers: [...this.layers.keys()], session: this.session?.track.id ?? null, beatsPerBar: BEATS_PER_BAR };
  }
}

export const radio = new RadioEngine();
if (import.meta.env.DEV) (window as unknown as { __radio?: RadioEngine }).__radio = radio;
