/** efectos de sonido sintetizados con webaudio (sin archivos externos). */
const KEY = 'frutiger-aero-islands:sonidos';

let ctx: AudioContext | null = null;
let enabled = true;
try {
  enabled = window.localStorage.getItem(KEY) !== 'off';
} catch {
  /* sin almacenamiento */
}
const listeners = new Set<() => void>();

function ac(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {}) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.18, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain: number, freq: number) {
  const c = ac();
  if (!c || !enabled) return;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

export const sfx = {
  pop() {
    tone(480, 0.09, { to: 980, gain: 0.2 });
    tone(1400, 0.05, { gain: 0.06, at: 0.02 });
  },
  coin() {
    tone(988, 0.1, { type: 'triangle', gain: 0.12 });
    tone(1318, 0.18, { type: 'triangle', gain: 0.12, at: 0.08 });
  },
  place() {
    tone(260, 0.14, { to: 150, gain: 0.22 });
    noise(0.06, 0.05, 900);
  },
  error() {
    tone(190, 0.14, { type: 'square', gain: 0.05, to: 140 });
  },
  splash() {
    noise(0.3, 0.12, 1800);
    tone(700, 0.12, { to: 1200, gain: 0.07 });
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.13, at: i * 0.09 }));
  },
  click() {
    tone(900, 0.04, { gain: 0.06 });
  },
  isEnabled: () => enabled,
  setEnabled(v: boolean) {
    enabled = v;
    try {
      window.localStorage.setItem(KEY, v ? 'on' : 'off');
    } catch {
      /* sin almacenamiento */
    }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
