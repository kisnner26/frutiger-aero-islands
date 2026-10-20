/** planeta y cuenca interior del mundo, dibujados por código con el mismo lápiz del juego. */
import { cloudCanvas, softBlob } from './aero';
import { projectLonLat } from '../world/geoProjection';
import { hatch, makeCanvas, paperGrain, pencilize, rng, vnoise, wobbleEllipse } from './pencil';

type LonLat = [number, number];

/** contornos simplificados (lon, lat) trazados a mano para este proyecto; no derivan de datos externos. */
export const CONTINENTS: Record<string, LonLat[]> = {
  norteamerica: [[-168, 66], [-157, 71], [-140, 70], [-120, 70], [-95, 68], [-90, 64], [-94, 58], [-85, 55], [-80, 52], [-79, 58], [-77, 62], [-70, 60], [-62, 58], [-56, 52], [-60, 47], [-66, 45], [-70, 42], [-74, 40], [-76, 35], [-80, 32], [-81, 26], [-83, 29], [-89, 30], [-94, 29], [-97, 26], [-97, 22], [-94, 18], [-90, 21], [-87, 21], [-88, 16], [-84, 15], [-83, 10], [-79, 9], [-77, 8], [-79, 7], [-84, 9], [-87, 13], [-92, 15], [-96, 16], [-105, 20], [-110, 24], [-114, 30], [-117, 33], [-121, 35], [-124, 40], [-124, 47], [-128, 51], [-134, 57], [-141, 60], [-150, 60], [-158, 57], [-165, 55], [-162, 60], [-165, 63]],
  sudamerica: [[-77, 8], [-72, 12], [-65, 10], [-60, 8], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -9], [-39, -14], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-62, -40], [-65, -45], [-68, -50], [-69, -54], [-72, -53], [-74, -47], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, 0], [-78, 5]],
  groenlandia: [[-73, 78], [-60, 82], [-30, 83], [-20, 76], [-22, 70], [-40, 65], [-48, 61], [-52, 66], [-58, 75]],
  africa: [[-6, 36], [10, 37], [11, 33], [20, 32], [30, 31], [33, 28], [35, 23], [38, 18], [43, 12], [51, 11], [48, 5], [41, -2], [40, -10], [40, -15], [35, -22], [33, -27], [27, -33], [20, -35], [18, -32], [14, -23], [12, -12], [13, -5], [9, -1], [9, 4], [5, 5], [-4, 5], [-8, 4], [-13, 8], [-17, 14], [-17, 21], [-13, 27], [-10, 30]],
  eurasia: [[-9, 37], [-9, 43], [-2, 43], [-1, 46], [-4, 48], [2, 51], [8, 54], [10, 56], [14, 54], [21, 55], [24, 59], [30, 60], [32, 66], [45, 68], [60, 69], [70, 73], [90, 76], [110, 77], [130, 72], [150, 71], [165, 69], [178, 66], [172, 62], [165, 62], [162, 57], [156, 51], [155, 57], [143, 59], [138, 54], [141, 48], [135, 43], [130, 42], [127, 40], [126, 35], [122, 38], [121, 40], [118, 38], [122, 31], [121, 25], [116, 22], [110, 20], [108, 16], [109, 12], [105, 9], [101, 13], [100, 8], [103, 1], [100, 4], [98, 10], [98, 16], [94, 18], [92, 22], [88, 22], [80, 15], [77, 8], [73, 17], [72, 22], [67, 25], [61, 25], [57, 26], [52, 28], [48, 30], [50, 26], [52, 24], [56, 24], [58, 22], [55, 17], [44, 12], [43, 15], [39, 21], [35, 28], [34, 31], [36, 36], [30, 36], [27, 37], [26, 40], [28, 41], [24, 40], [22, 37], [20, 40], [19, 42], [13, 45], [12, 44], [14, 42], [18, 40], [16, 38], [15, 38], [12, 41], [9, 44], [7, 43], [3, 43], [0, 39], [-2, 37], [-6, 36]],
  escandinavia: [[5, 58], [5, 62], [14, 67], [20, 70], [28, 71], [30, 69], [25, 65], [21, 63], [17, 60], [12, 56], [8, 58]],
  australia: [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [151, -34], [147, -39], [141, -38], [135, -35], [130, -32], [124, -34], [115, -34]],
  britania: [[-6, 50], [2, 51], [0, 53], [-3, 58], [-6, 56], [-5, 52]],
  japon: [[130, 31], [135, 34], [141, 38], [142, 45], [140, 42], [138, 36], [132, 33]],
  borneo: [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  sumatra: [[95, 5], [106, -6], [102, -4], [98, 1]],
  madagascar: [[44, -25], [50, -15], [47, -12], [43, -17]],
  nuevazelanda: [[172, -35], [178, -38], [173, -42], [167, -46], [171, -41]],
  antartida: [[-180, -78], [-180, -90], [180, -90], [180, -78], [90, -67], [0, -70], [-60, -65], [-120, -74]],
};

/** punto dentro de polígono (trazado de rayos), para pruebas y consultas. */
export function pointInPolygon(lon: number, lat: number, poly: readonly LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isLand(lon: number, lat: number): boolean {
  return Object.values(CONTINENTS).some((poly) => pointInPolygon(lon, lat, poly));
}

const MASK_W = 2048;
const MASK_H = 1024;
let maskCache: Uint8ClampedArray | null = null;

function landMask(): Uint8ClampedArray {
  if (maskCache) return maskCache;
  const c = makeCanvas(MASK_W, MASK_H);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  for (const poly of Object.values(CONTINENTS)) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * MASK_W;
      const y = ((90 - lat) / 180) * MASK_H;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  maskCache = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  return maskCache;
}

function sampleMask(m: Uint8ClampedArray, lon: number, lat: number): number {
  const fx = ((lon / Math.PI + 1) / 2) * MASK_W - 0.5;
  const fy = (0.5 - lat / Math.PI) * MASK_H - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.max(0, Math.min(MASK_H - 2, Math.floor(fy)));
  const tx = fx - x0;
  const ty = fy - y0;
  const px = (x: number, y: number) => m[(y * MASK_W + ((x + MASK_W) % MASK_W)) * 4];
  const a = px(x0, y0) + (px(x0 + 1, y0) - px(x0, y0)) * tx;
  const b = px(x0, y0 + 1) + (px(x0 + 1, y0 + 1) - px(x0, y0 + 1)) * tx;
  return (a + (b - a) * ty) / 255;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/** planeta azul con continentes verdes, sombreado y atmósfera; cristal sutil en el borde. */
export function renderPlanet(size = 720): HTMLCanvasElement {
  const mask = landMask();
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const R = size / 2 - 8;
  const tilt = 0.36;
  const lon0 = (-38 * Math.PI) / 180;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const L = [-0.5, 0.56, 0.66];
  const ln = Math.hypot(L[0], L[1], L[2]);
  L[0] /= ln;
  L[1] /= ln;
  L[2] /= ln;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - size / 2) / R;
      const dy = (y + 0.5 - size / 2) / R;
      const r2 = dx * dx + dy * dy;
      const rr = Math.sqrt(r2);
      if (rr > 1.004) continue;
      const nz = Math.sqrt(Math.max(0, 1 - r2));
      const X = dx;
      const Y = -dy;
      const Y2 = Y * ct + nz * st;
      const Z2 = -Y * st + nz * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, Y2)));
      let lon = lon0 + Math.atan2(X, Z2);
      if (lon > Math.PI) lon -= Math.PI * 2;
      if (lon < -Math.PI) lon += Math.PI * 2;
      const land = sampleMask(mask, lon, lat);
      const near = (sampleMask(mask, lon + 0.03, lat) + sampleMask(mask, lon - 0.03, lat) + sampleMask(mask, lon, lat + 0.03) + sampleMask(mask, lon, lat - 0.03)) / 4;
      const latd = (lat * 180) / Math.PI;
      const lond = (lon * 180) / Math.PI;
      const n1 = vnoise(lon * 5 + 3, lat * 5, 2);
      const n2 = vnoise(lon * 14, lat * 14 + 7, 5);
      let r: number, g: number, b: number;
      if (land > 0.5) {
        const dry = Math.max(0, 1 - Math.abs(latd - 24) / 9) * (lond > -18 && lond < 58 ? 1 : 0) * (n1 > 0.4 ? 1 : 0.35);
        r = mix(52, 142, n1 * 0.8 + n2 * 0.3);
        g = mix(124, 194, n1 * 0.8 + n2 * 0.3);
        b = mix(52, 86, n1);
        r = mix(r, 214, dry);
        g = mix(g, 190, dry);
        b = mix(b, 120, dry);
        const snow = Math.max(0, (Math.abs(latd) - 62) / 14);
        r = mix(r, 236, snow);
        g = mix(g, 244, snow);
        b = mix(b, 250, snow);
      } else {
        const coast = near * 2.4;
        r = mix(16, 54, n1 * 0.9 + coast);
        g = mix(88, 178, n1 * 0.9 + coast);
        b = mix(176, 232, n1 * 0.7 + coast * 0.6);
      }
      const diff = Math.max(0, X * L[0] + Y * L[1] + nz * L[2]);
      const shade = 0.5 + 0.58 * diff;
      r *= shade;
      g *= shade;
      b *= shade;
      const fres = Math.pow(1 - nz, 2.8);
      r += 150 * fres * 0.5;
      g += 205 * fres * 0.5;
      b += 255 * fres * 0.5;
      if (land < 0.5) {
        const rx = 2 * nz * (X * L[0] + Y * L[1] + nz * L[2]) * nz - L[2];
        const spec = Math.pow(Math.max(0, rx), 40) * 0.28;
        r += 255 * spec;
        g += 255 * spec;
        b += 255 * spec;
      }
      const o = (y * size + x) * 4;
      d[o] = Math.min(255, r);
      d[o + 1] = Math.min(255, g);
      d[o + 2] = Math.min(255, b);
      d[o + 3] = Math.max(0, Math.min(255, (1.004 - rr) * R * 1.2 * 255));
    }
  }
  ctx.putImageData(img, 0, 0);
  pencilize(c, { grain: 0.55, outline: false, edgeLines: false, angle: 38, seed: 4 });

  // rayado de lápiz suave dentro del disco
  const rg = rng(12);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2);
  ctx.clip();
  const box = { x: 0, y: 0, w: size, h: size };
  hatch(ctx, box, { color: '#0a3f86', alpha: 0.06, angle: 28, spacing: size / 220, width: size / 330, seed: 21, len: size / 12 });
  hatch(ctx, box, { color: '#d8f4ff', alpha: 0.06, angle: 112, spacing: size / 160, width: size / 300, seed: 22, len: size / 14, skip: 0.3 });
  // nubes tenues, pocas
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const a = rg() * Math.PI * 2;
    const dd = Math.sqrt(rg()) * R * 0.85;
    const x = size / 2 + Math.cos(a) * dd;
    const y = size / 2 + Math.sin(a) * dd;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.16 + rg() * 0.16;
    ctx.lineWidth = size / 120 + rg() * size / 110;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + size * 0.04, y - size * 0.012, x + size * 0.08, y + size * 0.012, x + size * (0.1 + rg() * 0.05), y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // borde de vidrio: contorno de lápiz, aro blanco fino y un solo reflejo discreto
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(16,64,120,.55)';
  ctx.lineWidth = size / 170;
  wobbleEllipse(ctx, size / 2, size / 2, R, R, 0.004, rng(3));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = size / 220;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, R - size / 120, 0, Math.PI * 2);
  ctx.stroke();
  const hl = ctx.createLinearGradient(size * 0.2, size * 0.2, size * 0.5, size * 0.1);
  hl.addColorStop(0, 'rgba(255,255,255,.0)');
  hl.addColorStop(0.5, 'rgba(255,255,255,.7)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = hl;
  ctx.lineWidth = size / 60;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, R * 0.9, Math.PI * 1.08, Math.PI * 1.38);
  ctx.stroke();
  paperGrain(c, 0.35, 11);
  return c;
}

/** halo claro tras el planeta. */
export function renderHalo(size = 512): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  softBlob(ctx, size / 2, size / 2, size / 2, [255, 255, 255], 0.55);
  return c;
}

/** cielo claro de la vista lejana, con nubes y rayado suave. */
export function renderWorldSky(w: number, h: number, dpr: number): HTMLCanvasElement {
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  const c = makeCanvas(pw, ph);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const g = ctx.createRadialGradient(pw / 2, ph * 0.46, 0, pw / 2, ph * 0.46, Math.max(pw, ph) * 0.75);
  g.addColorStop(0, '#d6efff');
  g.addColorStop(0.45, '#8fcaf4');
  g.addColorStop(1, '#2f7fd0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, pw, ph);
  const box = { x: 0, y: 0, w: pw, h: ph };
  hatch(ctx, box, { color: '#2f6fc8', alpha: 0.07, angle: -24, spacing: 5 * dpr, width: 2.2 * dpr, seed: 61, amp: 3 * dpr, len: 100 * dpr });
  hatch(ctx, box, { color: '#ffffff', alpha: 0.08, angle: -18, spacing: 7 * dpr, width: 2.6 * dpr, seed: 62, amp: 3 * dpr, len: 120 * dpr, skip: 0.3 });
  const cw = Math.round(pw * 0.42);
  const chh = Math.round(cw * 0.4);
  ctx.globalAlpha = 0.85;
  ctx.drawImage(cloudCanvas(cw, chh, 31), -cw * 0.12, ph * 0.66, cw, chh);
  ctx.drawImage(cloudCanvas(cw, chh, 32), pw - cw * 0.9, ph * 0.12, cw * 0.9, chh * 0.9);
  ctx.globalAlpha = 1;
  paperGrain(c, 0.4, 7);
  return c;
}

/** cuenca interior: océano pintado con costas verdes en el borde, como la cara interna de un globo. */
export function renderBasin(size = 1600): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const r = rng(44);
  const cx = size / 2;
  const R = size / 2 - 6;
  const box = { x: 0, y: 0, w: size, h: size };

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(cx, cx * 0.9, 0, cx, cx, R);
  g.addColorStop(0, '#9fe8f0');
  g.addColorStop(0.5, '#4fc2e4');
  g.addColorStop(0.85, '#2a8fcc');
  g.addColorStop(1, '#1a64a8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  hatch(ctx, box, { color: '#17608f', alpha: 0.18, angle: 4, spacing: size / 260, width: size / 520, seed: 71, amp: 2, len: size / 18 });
  hatch(ctx, box, { color: '#bff4ff', alpha: 0.22, angle: -3, spacing: size / 200, width: size / 480, seed: 72, amp: 2, len: size / 15, skip: 0.25 });

  // continentes como bajíos claros: ubican cada zona del mundo bajo las islas (misma proyección que la ubicación por país)
  const kpx = (size / 2 - 6) / 1000;
  ctx.save();
  for (const [name, poly] of Object.entries(CONTINENTS)) {
    if (name === 'antartida') continue;
    const pts = poly.map(([lon, lat]) => projectLonLat(lon, lat));
    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 650) ok = false;
    }
    if (!ok) continue;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = cx + p.x * kpx;
      const y = cx + p.y * kpx;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(218,246,208,.34)';
    ctx.fill();
    ctx.save();
    ctx.clip();
    hatch(ctx, box, { color: '#5aa84a', alpha: 0.16, angle: 62, spacing: size / 300, width: size / 620, seed: 75, len: size / 36 });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = size / 420;
    ctx.stroke();
  }
  ctx.restore();

  // costas: tres arcos de tierra en el borde, con arena y espuma
  const shore = (th: number) => {
    let v = 0;
    for (const [c0, w, depth] of [[0.7, 0.55, 0.15], [2.5, 0.5, 0.12], [4.3, 0.7, 0.14], [5.6, 0.35, 0.09]] as const) {
      const dd = Math.abs(((th - c0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      v = Math.max(v, depth * Math.max(0, 1 - dd / w) * (0.75 + 0.5 * vnoise(th * 5, 2, 3)));
    }
    return R * (1 - v - 0.02);
  };
  const ring = (inner: (th: number) => number) => {
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const th = (i / 240) * Math.PI * 2;
      const rr = inner(th);
      const x = cx + Math.cos(th) * rr;
      const y = cx + Math.sin(th) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.arc(cx, cx, R + 4, 0, Math.PI * 2, true);
  };
  ctx.save();
  ring((th) => shore(th) - 10);
  ctx.fillStyle = '#f2dea6';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.save();
  ring((th) => shore(th) + 2);
  ctx.clip('evenodd');
  ctx.fillStyle = '#78b848';
  ctx.fillRect(0, 0, size, size);
  hatch(ctx, box, { color: '#3d8a2c', alpha: 0.5, angle: 60, spacing: size / 300, width: size / 600, seed: 73, len: size / 30 });
  hatch(ctx, box, { color: '#c6ec7a', alpha: 0.5, angle: 118, spacing: size / 240, width: size / 520, seed: 74, len: size / 34, skip: 0.3 });
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = size / 400;
  ring((th) => shore(th) - 10);
  ctx.stroke();
  ctx.restore();

  // aro de vidrio con grosor, sombra interior y un reflejo discreto
  const rim = ctx.createRadialGradient(cx, cx, R * 0.9, cx, cx, R);
  rim.addColorStop(0, 'rgba(20,80,150,0)');
  rim.addColorStop(1, 'rgba(10,50,110,.5)');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cx, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16,64,120,.6)';
  ctx.lineWidth = size / 220;
  wobbleEllipse(ctx, cx, cx, R, R, 0.004, r);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = size / 260;
  ctx.beginPath();
  ctx.arc(cx, cx, R - size / 90, 0, Math.PI * 2);
  ctx.stroke();
  paperGrain(c, 0.35, 13);
  return c;
}

/** viñeta y reflejos de vidrio a pantalla completa para la vista interior. */
export function renderGlassFrame(w: number, h: number, dpr: number): HTMLCanvasElement {
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  const c = makeCanvas(pw, ph);
  const ctx = c.getContext('2d')!;
  const R = Math.max(pw, ph) * 0.52;
  const g = ctx.createRadialGradient(pw / 2, ph / 2, R * 0.62, pw / 2, ph / 2, R * 1.12);
  g.addColorStop(0, 'rgba(10,60,120,0)');
  g.addColorStop(0.7, 'rgba(10,60,130,.18)');
  g.addColorStop(1, 'rgba(6,40,100,.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, pw, ph);
  ctx.lineCap = 'round';
  const arc = (a0: number, a1: number, rad: number, alpha: number, width: number) => {
    const grad = ctx.createLinearGradient(pw / 2 + Math.cos(a0) * rad, ph / 2 + Math.sin(a0) * rad, pw / 2 + Math.cos(a1) * rad, ph / 2 + Math.sin(a1) * rad);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(pw / 2, ph / 2, rad, a0, a1);
    ctx.stroke();
  };
  arc(Math.PI * 1.06, Math.PI * 1.42, R * 0.97, 0.5, 9 * dpr);
  arc(Math.PI * 0.06, Math.PI * 0.3, R * 0.97, 0.22, 6 * dpr);
  return c;
}
