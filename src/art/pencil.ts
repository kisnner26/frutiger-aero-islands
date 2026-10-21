import { timed } from '../perf';
/** estilo lápiz de colores: ruido, rasterizado de svg y filtro de papel/trazo.
 *  todo es procedural y propio; no depende de pixi. */

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function vnoise(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

const svgCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  let p = svgCache.get(url);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`no se pudo cargar ${url}`));
      img.src = url;
    });
    svgCache.set(url, p);
    p.catch(() => svgCache.delete(url));
  }
  return p;
}

export interface PencilOptions {
  /** fuerza del grano de papel y trazo (0–1). */
  grain?: number;
  outline?: boolean;
  edgeLines?: boolean;
  /** ángulo del sombreado en grados. */
  angle?: number;
  seed?: number;
}

/** aplica grano de lápiz, contorno tembloroso y líneas internas. modifica el canvas. */
export function pencilize(canvas: HTMLCanvasElement, opts: PencilOptions = {}): HTMLCanvasElement {
  const { grain = 0.8, outline = true, edgeLines = true, angle = 55, seed = 1 } = opts;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const solid = new Uint8Array(w * h);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    solid[i] = src[i * 4 + 3] >= 110 ? 1 : 0;
    lum[i] = src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11;
  }
  const scale = w / 256;
  const th = (angle * Math.PI) / 180;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  const R = Math.max(1, Math.round(2 * scale));
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : solid[y * w + x]);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const a = src[o + 3];

      if (a > 0) {
        const u = (x * ct + y * st) / scale;
        const v = (-x * st + y * ct) / scale;
        const stripe = 0.5 + 0.5 * Math.sin(u * 2.4 + 3 * vnoise(v / 9, u / 40, seed));
        const tooth = vnoise(x / (1.1 * scale), y / (1.1 * scale), seed + 3) * 0.6 + vnoise(x / (2.6 * scale), y / (2.6 * scale), seed + 4) * 0.4;
        const val = stripe * 0.45 + tooth * 0.55;
        const f = 1 - grain * 0.2 + grain * 0.3 * val - grain * 0.08;
        let r = src[o] * f;
        let g = src[o + 1] * f;
        let b = src[o + 2] * f;
        const speck = 0.26 - tooth;
        if (speck > 0) {
          const m = Math.min(0.55, speck * 2.2 * grain);
          r += (255 - r) * m;
          g += (255 - g) * m;
          b += (255 - b) * m;
        }
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
      }

      if (edgeLines && solid[i] && x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = lum[i + 1] - lum[i - 1] + (lum[i - w + 1] - lum[i - w - 1] + lum[i + w + 1] - lum[i + w - 1]) * 0.5;
        const gy = lum[i + w] - lum[i - w] + (lum[i + w - 1] - lum[i - w - 1] + lum[i + w + 1] - lum[i - w + 1]) * 0.5;
        const mag = Math.hypot(gx, gy);
        if (mag > 24) {
          const k = 1 - Math.min(0.42, ((mag - 24) / 120) * 0.42);
          out[o] *= k;
          out[o + 1] *= k;
          out[o + 2] *= k;
        }
      }

      if (outline) {
        const wx = Math.round(x + (vnoise(x / (7 * scale), y / (7 * scale), seed + 7) - 0.5) * 2.6 * scale);
        const wy = Math.round(y + (vnoise(x / (7 * scale) + 40, y / (7 * scale) + 40, seed + 8) - 0.5) * 2.6 * scale);
        const here = at(wx, wy);
        let edge = false;
        for (let dy = -R; dy <= R && !edge; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            if (at(x + dx, y + dy) !== here) {
              edge = true;
              break;
            }
          }
        }
        if (edge) {
          const n = vnoise(x / scale, y / scale, seed + 11);
          if (n > 0.16) {
            if (here) {
              out[o] *= 0.5;
              out[o + 1] *= 0.52;
              out[o + 2] *= 0.55;
            } else {
              const al = 0.55 + 0.35 * n;
              const base = a / 255;
              const na = al + base * (1 - al);
              out[o] = (28 * al + out[o] * base * (1 - al)) / na;
              out[o + 1] = (52 * al + out[o + 1] * base * (1 - al)) / na;
              out[o + 2] = (58 * al + out[o + 2] * base * (1 - al)) / na;
              out[o + 3] = na * 255;
            }
          }
        }
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** estilo de dibujo de los sprites: 'aero' (render brillante de cristal y plástico) o 'lapiz' (el trazo a lápiz original). */
export const ART_STYLE: 'aero' | 'lapiz' = 'aero';

/** render frutiger aero: color saturado, luz de borde arriba-izquierda, brillo de cristal, sombra de oclusión y contorno azul fino. modifica el canvas. */
export function aeroize(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const s = w / 256;
  const out = makeCanvas(w, h);
  const o = out.getContext('2d')!;
  o.filter = 'saturate(1.3) contrast(1.08) brightness(1.04)';
  o.drawImage(canvas, 0, 0);
  o.filter = 'none';

  const tinted = (src: HTMLCanvasElement, color: string) => {
    const t = makeCanvas(w, h);
    const tc = t.getContext('2d')!;
    tc.drawImage(src, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = color;
    tc.fillRect(0, 0, w, h);
    return t;
  };
  /** borde de la silueta en una dirección: la silueta menos ella misma desplazada. */
  const edge = (dx: number, dy: number, color: string) => {
    const e = makeCanvas(w, h);
    const ec = e.getContext('2d')!;
    ec.drawImage(canvas, 0, 0);
    ec.globalCompositeOperation = 'destination-out';
    ec.drawImage(canvas, dx, dy);
    return tinted(e, color);
  };
  const d = Math.max(1.4, 2.4 * s);
  o.globalCompositeOperation = 'source-atop';
  o.globalAlpha = 0.62;
  o.drawImage(edge(d, d, '#ffffff'), 0, 0);
  o.globalAlpha = 0.34;
  o.drawImage(edge(-d, -d, '#0a3a78'), 0, 0);
  o.globalAlpha = 1;

  const gloss = o.createLinearGradient(0, 0, 0, h * 0.6);
  gloss.addColorStop(0, 'rgba(255,255,255,.3)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = gloss;
  o.fillRect(0, 0, w, h);
  const ao = o.createLinearGradient(0, h * 0.62, 0, h);
  ao.addColorStop(0, 'rgba(10,50,100,0)');
  ao.addColorStop(1, 'rgba(10,50,100,.2)');
  o.fillStyle = ao;
  o.fillRect(0, 0, w, h);

  // contorno azul fino detrás (8 direcciones)
  o.globalCompositeOperation = 'destination-over';
  const line = tinted(canvas, 'rgba(8,60,112,.6)');
  const r = Math.max(1, 1.5 * s);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    o.drawImage(line, Math.cos(a) * r, Math.sin(a) * r);
  }

  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(out, 0, 0);
  return canvas;
}

/** textura de papel: moteado claro/oscuro sobre todo el canvas (multiplicación suave). */
export function paperGrain(canvas: HTMLCanvasElement, strength = 0.5, seed = 9): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const s = Math.max(1, w / 900);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const t = vnoise(x / (1.2 * s), y / (1.2 * s), seed) * 0.55 + vnoise(x / (3.4 * s), y / (3.4 * s), seed + 2) * 0.45;
      const k = 1 + (t - 0.5) * 0.34 * strength;
      d[o] = d[o] * k;
      d[o + 1] = d[o + 1] * k;
      d[o + 2] = d[o + 2] * k;
      if (t < 0.2) {
        const m = (0.2 - t) * 1.6 * strength;
        d[o] += (255 - d[o]) * m;
        d[o + 1] += (255 - d[o + 1]) * m;
        d[o + 2] += (255 - d[o + 2]) * m;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

const spriteCache = new Map<string, Promise<HTMLCanvasElement>>();

/** svg → canvas con estilo lápiz; cachea por url y tamaño. */
export function pencilSprite(url: string, size = 256, opts: PencilOptions = {}): Promise<HTMLCanvasElement> {
  const key = `${ART_STYLE}|${url}|${size}|${JSON.stringify(opts)}`;
  let p = spriteCache.get(key);
  if (!p) {
    p = loadImage(url).then((img) => {
      const c = makeCanvas(size, size);
      c.getContext('2d')!.drawImage(img, 0, 0, size, size);
      return timed('art:sprite', () => (ART_STYLE === 'aero' ? aeroize(c) : pencilize(c, opts)));
    });
    spriteCache.set(key, p);
    p.catch(() => spriteCache.delete(key));
  }
  return p;
}

/* ---------- trazos ---------- */

type Pt = [number, number];

/** línea que tiembla como un trazo a mano. */
export function wobbleLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, amp: number, r: () => number, steps = 8) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const len = Math.hypot(nx, ny) || 1;
  let off = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    off += (r() - 0.5) * amp;
    off *= 0.8;
    ctx.lineTo(a[0] + (b[0] - a[0]) * t + (nx / len) * off, a[1] + (b[1] - a[1]) * t + (ny / len) * off);
  }
  ctx.stroke();
}

export interface HatchOptions {
  color: string;
  alpha: number;
  angle: number;
  spacing: number;
  width: number;
  amp?: number;
  seed?: number;
  /** probabilidad de omitir un trazo para dejar ver el papel. */
  skip?: number;
  /** largo medio de cada trazo en píxeles; por defecto trazos cortos. */
  len?: number;
}

/** sombreado con trazos cortos paralelos dentro del recorte activo (como rayado a lápiz). */
export function hatch(ctx: CanvasRenderingContext2D, bounds: { x: number; y: number; w: number; h: number }, o: HatchOptions) {
  const r = rng(o.seed ?? 1);
  const th = (o.angle * Math.PI) / 180;
  const dx = Math.cos(th);
  const dy = Math.sin(th);
  const diag = Math.hypot(bounds.w, bounds.h);
  const len = o.len ?? Math.max(40, o.spacing * 14);
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = o.color;
  for (let t = -diag / 2; t < diag / 2; t += o.spacing * (0.6 + r() * 0.8)) {
    let sPos = -diag / 2 + r() * len;
    while (sPos < diag / 2) {
      const l = len * (0.5 + r());
      if (r() >= (o.skip ?? 0.12)) {
        const px = cx - dy * t + dx * sPos;
        const py = cy + dx * t + dy * sPos;
        const jitter = (r() - 0.5) * o.spacing * 0.8;
        const a = [px - dy * jitter, py + dx * jitter] as Pt;
        const b = [a[0] + dx * l, a[1] + dy * l] as Pt;
        ctx.globalAlpha = o.alpha * (0.5 + r() * 0.7);
        ctx.lineWidth = o.width * (0.7 + r() * 0.7);
        wobbleLine(ctx, a, b, o.amp ?? 1.2, r, 5);
      }
      sPos += l + r() * len * 0.4;
    }
  }
  ctx.restore();
}

export function wobbleEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, amp: number, r: () => number) {
  ctx.beginPath();
  const n = 90;
  const phase = r() * 6;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (vnoise(Math.cos(a) * 2 + phase, Math.sin(a) * 2 + phase, 5) - 0.5) * amp;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
