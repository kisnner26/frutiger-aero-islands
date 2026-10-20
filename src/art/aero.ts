/** piezas procedurales del estilo frutiger aero: cristal, nubes, cáusticas y juncos. */
import { makeCanvas, rng, vnoise } from './pencil';

/** pincelada suave: círculo con degradado radial que se desvanece. */
export function softBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: [number, number, number], a: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`);
  g.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * 0.55})`);
  g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** nube cumulo con sombra azulada abajo y luz cálida arriba. */
export function cloudCanvas(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const r = rng(seed);
  const blobs: Array<[number, number, number]> = [];
  const n = 16 + Math.round(w / 40);
  for (let i = 0; i < n; i++) {
    const t = r();
    const x = w * (0.14 + 0.72 * t);
    const dome = Math.sin(t * Math.PI);
    const y = h * (0.7 - 0.42 * dome * (0.55 + r() * 0.45));
    blobs.push([x, y, h * (0.16 + 0.2 * dome * (0.5 + r() * 0.5))]);
  }
  for (const [x, y, rad] of blobs) softBlob(ctx, x, y + rad * 0.45, rad * 1.1, [150, 176, 214], 0.55);
  for (const [x, y, rad] of blobs) softBlob(ctx, x, y, rad, [255, 255, 255], 0.9);
  for (const [x, y, rad] of blobs) softBlob(ctx, x - rad * 0.2, y - rad * 0.35, rad * 0.6, [255, 250, 240], 0.7);
  // base plana difuminada
  const g = ctx.createLinearGradient(0, h * 0.72, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
  return c;
}

/** esfera de cristal con paisaje invertido en su interior, como las burbujas de la referencia. */
export function glassBubble(size: number, opts: { tint?: [number, number, number]; seed?: number } = {}): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const r = rng(opts.seed ?? 3);
  const cx = size / 2;
  const R = size * 0.47;
  const tint = opts.tint ?? [255, 255, 255];

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, R, 0, Math.PI * 2);
  ctx.clip();

  // paisaje reflejado e invertido: pasto arriba, cielo y nubes abajo
  const sky = ctx.createLinearGradient(0, cx - R, 0, cx + R);
  sky.addColorStop(0, '#3f8a3a');
  sky.addColorStop(0.3, '#8cc85a');
  sky.addColorStop(0.42, '#6fb0e0');
  sky.addColorStop(0.7, '#a8d6f6');
  sky.addColorStop(1, '#e8f6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5; i++) softBlob(ctx, cx + (r() - 0.5) * R * 1.2, cx + R * (0.15 + r() * 0.6), R * (0.25 + r() * 0.25), [255, 255, 255], 0.85);
  // luz que atraviesa la esfera (cáustica interna)
  softBlob(ctx, cx + R * 0.15, cx + R * 0.55, R * 0.7, [255, 255, 255], 0.35);
  // velo del cristal
  ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},0.12)`;
  ctx.fillRect(0, 0, size, size);
  // borde de fresnel: translúcido en el centro, brillante en el borde
  const rim = ctx.createRadialGradient(cx, cx, R * 0.62, cx, cx, R);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  rim.addColorStop(1, 'rgba(255,255,255,0.8)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, size, size);
  // película iridiscente muy tenue
  const film = ctx.createRadialGradient(cx, cx, R * 0.78, cx, cx, R * 0.97);
  film.addColorStop(0, 'rgba(255,120,220,0)');
  film.addColorStop(0.5, 'rgba(160,255,230,0.22)');
  film.addColorStop(1, 'rgba(255,230,140,0)');
  ctx.fillStyle = film;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // contorno fino oscuro y brillo exterior
  ctx.lineWidth = Math.max(1, size * 0.012);
  ctx.strokeStyle = 'rgba(20,70,110,0.45)';
  ctx.beginPath();
  ctx.arc(cx, cx, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, size * 0.008);
  ctx.beginPath();
  ctx.arc(cx, cx, R - size * 0.012, 0, Math.PI * 2);
  ctx.stroke();

  // brillo especular principal (ventana) y secundario (creciente)
  ctx.save();
  ctx.translate(cx - R * 0.38, cx - R * 0.48);
  ctx.rotate(-0.6);
  const hl = ctx.createLinearGradient(0, -R * 0.2, 0, R * 0.2);
  hl.addColorStop(0, 'rgba(255,255,255,0.95)');
  hl.addColorStop(1, 'rgba(255,255,255,0.1)');
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.34, R * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = size * 0.022;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cx, R * 0.84, Math.PI * 0.18, Math.PI * 0.46);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx + R * 0.46, cx + R * 0.52, size * 0.016, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** textura de cáusticas (redes de luz del fondo del agua), sin costuras. */
export function causticsTile(size: number): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const T = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * T;
      const v = (y / size) * T;
      const a = Math.sin(3 * u + 1.7 * Math.sin(2 * v + 0.6)) + Math.sin(3 * v + 1.7 * Math.sin(2 * u + 1.3));
      const b = Math.sin(5 * u + 2.1 * Math.sin(3 * v)) + Math.sin(4 * v + 2.1 * Math.sin(5 * u + 2));
      const ridge = Math.pow(Math.max(0, 1 - Math.abs(a) / 1.15), 5) * 0.8 + Math.pow(Math.max(0, 1 - Math.abs(b) / 1.3), 6) * 0.45;
      const o = (y * size + x) * 4;
      d[o] = 235;
      d[o + 1] = 252;
      d[o + 2] = 255;
      d[o + 3] = Math.min(255, ridge * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** manojo de juncos para el primer plano. la base queda en el borde inferior. */
export function reedCanvas(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const r = rng(seed);
  const n = Math.round(w / 5);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w + (r() - 0.5) * 8;
    const bh = h * (0.45 + r() * 0.55);
    const lean = (r() - 0.5) * w * 0.14;
    const bw = 2.5 + r() * 4;
    const col = ['#2f7a2a', '#4f9a34', '#7cbc44', '#9ad25a'][Math.floor(r() * 4)];
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - bw, h);
    ctx.quadraticCurveTo(x - bw * 0.6 + lean * 0.3, h - bh * 0.6, x + lean, h - bh);
    ctx.quadraticCurveTo(x + bw * 0.6 + lean * 0.3, h - bh * 0.6, x + bw, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.2, h);
    ctx.quadraticCurveTo(x - bw * 0.1 + lean * 0.3, h - bh * 0.6, x + lean, h - bh);
    ctx.stroke();
  }
  return c;
}

/** destello de cuatro puntas. */
export function sparkleCanvas(size: number): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const m = size / 2;
  softBlob(ctx, m, m, m, [255, 255, 255], 0.9);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(m, size * 0.04);
  ctx.quadraticCurveTo(m + size * 0.04, m - size * 0.04, size * 0.96, m);
  ctx.quadraticCurveTo(m + size * 0.04, m + size * 0.04, m, size * 0.96);
  ctx.quadraticCurveTo(m - size * 0.04, m + size * 0.04, size * 0.04, m);
  ctx.quadraticCurveTo(m - size * 0.04, m - size * 0.04, m, size * 0.04);
  ctx.fill();
  return c;
}

/** silueta de montañas con ruido y neblina atmosférica. */
export function ridgeY(x: number, base: number, amp: number, freq: number, seed: number): number {
  return base - (vnoise(x * freq, seed, seed) * 0.7 + vnoise(x * freq * 2.7, seed + 5, seed) * 0.3) * amp;
}

import { loadImage } from './pencil';

/** svg → canvas sin filtro (para peces y piezas ya pintadas con degradados). */
export async function svgCanvas(url: string, size: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(url);
  const c = makeCanvas(size, size);
  c.getContext('2d')!.drawImage(img, 0, 0, size, size);
  return c;
}
