import { CATALOG_MAP } from '../catalog/catalog';
import { LAND_RADII, landRadii, landTier } from '../domain/geometry';
import type { PlacedObject } from '../domain/island';
import { K, TILT, project } from '../engine/projection';
import { cloudCanvas, ridgeY, softBlob } from './aero';
import { hatch, makeCanvas, paperGrain, pencilSprite, rng, vnoise, wobbleEllipse } from './pencil';

/** metros de escena que cubre la textura del suelo: mitad de ancho y alto. */
export const GROUND_HALF = { w: 450, h: 230 };
const S = 2;

const ex = (rx: number) => rx * K * S;
const ey = (ry: number) => ry * K * TILT * S;

/** isla dibujada a lápiz: agua en torno, arena, hierba. centrada en el origen de la escena. */
const groundCache = new Map<number, HTMLCanvasElement>();

/** el terreno crece con el nivel; el lienzo mide siempre lo mismo y se redibuja al cambiar de tamaño. */
export function renderGround(level = 1): HTMLCanvasElement {
  const tier = landTier(level);
  const cached = groundCache.get(tier);
  if (cached) return cached;
  const land = landRadii(level);
  const grow = land.rx - LAND_RADII.rx;
  const growY = land.ry - LAND_RADII.ry;
  const area = (land.rx * land.ry) / (LAND_RADII.rx * LAND_RADII.ry);
  const W = GROUND_HALF.w * 2 * S;
  const H = GROUND_HALF.h * 2 * S;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const r = rng(21);
  const cx = W / 2;
  const cy = H / 2;
  const box = { x: 0, y: 0, w: W, h: H };

  const clipEllipse = (dy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy + dy * S, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
  };

  // sombra sobre el agua
  ctx.save();
  clipEllipse(26, ex(412 + grow), ey(334 + growY));
  hatch(ctx, box, { color: '#0f4a66', alpha: 0.5, angle: 8, spacing: 3.2, width: 2.4, seed: 2, amp: 2 });
  hatch(ctx, box, { color: '#1c6a8c', alpha: 0.35, angle: -12, spacing: 4.5, width: 2, seed: 3 });
  ctx.restore();

  // costado de arena (grosor)
  ctx.save();
  clipEllipse(20, ex(392 + grow), ey(312 + growY));
  ctx.fillStyle = '#c9a468';
  ctx.fillRect(0, 0, W, H);
  hatch(ctx, box, { color: '#8a6a34', alpha: 0.55, angle: 80, spacing: 3, width: 1.8, seed: 4 });
  ctx.restore();

  // arena
  ctx.save();
  clipEllipse(0, ex(392 + grow), ey(312 + growY));
  ctx.fillStyle = '#f3dfaa';
  ctx.fillRect(0, 0, W, H);
  hatch(ctx, box, { color: '#e2bd7a', alpha: 0.6, angle: 30, spacing: 3.4, width: 2, seed: 5 });
  hatch(ctx, box, { color: '#fff6d8', alpha: 0.7, angle: 115, spacing: 5, width: 2.4, seed: 6, skip: 0.3 });
  ctx.restore();

  // hierba
  ctx.save();
  clipEllipse(0, ex(land.rx), ey(land.ry));
  ctx.fillStyle = '#84c04a';
  ctx.fillRect(0, 0, W, H);
  hatch(ctx, box, { color: '#3d8a2c', alpha: 0.5, angle: 62, spacing: 3.4, width: 2, seed: 7, len: 26 });
  hatch(ctx, box, { color: '#5fae38', alpha: 0.5, angle: 118, spacing: 3.8, width: 2, seed: 8, len: 30 });
  hatch(ctx, box, { color: '#c6ec7a', alpha: 0.55, angle: 80, spacing: 6, width: 2.6, seed: 9, skip: 0.35, len: 24 });
  // manchas de tono para romper la uniformidad
  for (let i = 0; i < Math.round(38 * area); i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.85;
    const px = cx + Math.cos(a) * d * ex(land.rx);
    const py = cy + Math.sin(a) * d * ey(land.ry);
    const g2 = ctx.createRadialGradient(px, py, 0, px, py, 40 + r() * 60);
    g2.addColorStop(0, r() < 0.5 ? 'rgba(40,110,40,.28)' : 'rgba(210,240,120,.3)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(px - 120, py - 120, 240, 240);
  }
  // luz arriba-izquierda
  const grad = ctx.createRadialGradient(cx - ex(120), cy - ey(110), 10, cx - ex(120), cy - ey(110), ex(230));
  grad.addColorStop(0, 'rgba(255,255,200,.38)');
  grad.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // sombra de borde interior
  const rim = ctx.createRadialGradient(cx, cy, ex(250 + grow), cx, cy, ex(land.rx));
  rim.addColorStop(0, 'rgba(30,90,30,0)');
  rim.addColorStop(1, 'rgba(30,90,30,.35)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);
  // briznas
  ctx.lineCap = 'round';
  for (let i = 0; i < Math.round(520 * area); i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.95;
    const x = cx + Math.cos(a) * d * ex(land.rx);
    const y = cy + Math.sin(a) * d * ey(land.ry);
    ctx.strokeStyle = r() < 0.5 ? '#2f7a24' : '#a6dc5a';
    ctx.globalAlpha = 0.5 + r() * 0.4;
    ctx.lineWidth = 1.6;
    const h = 7 + r() * 9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 6, y - h * 0.6, x + (r() - 0.5) * 8, y - h);
    ctx.stroke();
  }
  ctx.restore();

  // contornos a lápiz (dos pasadas)
  ctx.lineWidth = 2.4;
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#3a7a2a' : '#2a5a22';
    ctx.globalAlpha = 0.75;
    wobbleEllipse(ctx, cx, cy, ex(land.rx), ey(land.ry), 0.02, r);
    ctx.stroke();
  }
  ctx.strokeStyle = '#6a5028';
  ctx.globalAlpha = 0.8;
  wobbleEllipse(ctx, cx, cy, ex(392 + grow), ey(312 + growY), 0.015, r);
  ctx.stroke();
  wobbleEllipse(ctx, cx, cy + 20 * S, ex(392 + grow), ey(312 + growY), 0.015, r);
  ctx.stroke();

  // ondas de agua alrededor
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  for (const [rx, ry, al] of [[430 + grow, 350 + growY, 0.75], [470 + grow, 385 + growY, 0.45]] as const) {
    ctx.globalAlpha = al;
    for (let k = 0; k < 2; k++) {
      wobbleEllipse(ctx, cx, cy + 8 * S, ex(rx), ey(ry), 0.012, r);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  paperGrain(c, 0.55, 3);
  groundCache.set(tier, c);
  return c;
}

/** cielo, montañas y lago con reflejos, estilo frutiger aero. */
export function renderBackdrop(w: number, h: number, dpr: number): HTMLCanvasElement {
  const pw = Math.round(w * dpr);
  const ph = Math.round(h * dpr);
  const c = makeCanvas(pw, ph);
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const r = rng(77);
  const horizon = Math.round(ph * 0.4);

  // cielo
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#1f6fd0');
  sky.addColorStop(0.5, '#4e9fe8');
  sky.addColorStop(0.85, '#a9d6f6');
  sky.addColorStop(1, '#dff1fc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, pw, horizon);
  // resplandor del sol
  const sx = pw * 0.8;
  const sy = horizon * 0.3;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(pw, ph) * 0.45);
  glow.addColorStop(0, 'rgba(255,255,240,.95)');
  glow.addColorStop(0.12, 'rgba(255,255,255,.5)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, pw, horizon);

  // nubes cúmulo: más grandes arriba, pequeñas hacia el horizonte
  const clouds: Array<[number, number, number, number]> = [
    [0.12, 0.2, 0.34, 11],
    [0.52, 0.1, 0.42, 12],
    [0.86, 0.34, 0.3, 13],
    [0.3, 0.55, 0.22, 14],
    [0.68, 0.62, 0.2, 15],
  ];
  for (const [fx, fy, fw, seed] of clouds) {
    const cw = Math.round(pw * fw);
    const chh = Math.round(cw * 0.42);
    ctx.drawImage(cloudCanvas(cw, chh, seed), pw * fx - cw / 2, horizon * fy - chh / 2, cw, chh);
  }

  // montañas lejanas y cercanas con neblina
  const ridge = (base: number, amp: number, freq: number, seed: number, top: string, bottom: string) => {
    const g = ctx.createLinearGradient(0, base - amp, 0, base + 4 * dpr);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= pw; x += 4) ctx.lineTo(x, ridgeY(x / dpr, base, amp, freq, seed));
    ctx.lineTo(pw, horizon);
    ctx.closePath();
    ctx.fill();
  };
  ridge(horizon - 4 * dpr, ph * 0.09, 0.0035, 3, '#7f9fc8', '#b7d0e8');
  ridge(horizon - 1 * dpr, ph * 0.05, 0.006, 9, '#3f8a6a', '#7fb88a');
  // sotobosque y juncos de la orilla lejana
  ctx.lineCap = 'round';
  for (let i = 0; i < pw / (2.2 * dpr); i++) {
    const x = (i / (pw / (2.2 * dpr))) * pw;
    const bh = (4 + r() * 12) * dpr;
    ctx.strokeStyle = ['#2f7a3a', '#4f9a44', '#8fcc58'][Math.floor(r() * 3)];
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.4 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, horizon + 1);
    ctx.lineTo(x + (r() - 0.5) * 3 * dpr, horizon - bh);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const haze = ctx.createLinearGradient(0, horizon - 40 * dpr, 0, horizon);
  haze.addColorStop(0, 'rgba(230,245,255,0)');
  haze.addColorStop(1, 'rgba(230,245,255,.55)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - 40 * dpr, pw, 40 * dpr);

  // lago
  const sea = ctx.createLinearGradient(0, horizon, 0, ph);
  sea.addColorStop(0, '#a6dcf2');
  sea.addColorStop(0.15, '#58b8e6');
  sea.addColorStop(0.55, '#2a86c8');
  sea.addColorStop(1, '#14589a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, pw, ph - horizon);

  // reflejo del cielo y las montañas con ondulación
  const snap = makeCanvas(pw, horizon);
  snap.getContext('2d')!.drawImage(c, 0, 0, pw, horizon, 0, 0, pw, horizon);
  for (let y = horizon; y < ph; y += 2) {
    const dist = y - horizon;
    const srcY = horizon - 2 - dist * 0.9;
    if (srcY < 0) break;
    const off = Math.sin(dist * 0.045 + vnoise(dist * 0.03, 1, 4) * 6) * (1.5 + dist * 0.025) * dpr;
    ctx.globalAlpha = Math.max(0, 0.55 * (1 - dist / (ph - horizon)));
    ctx.drawImage(snap, 0, srcY, pw, 2, off, y, pw, 2);
  }
  ctx.globalAlpha = 1;

  // estelas de luz y destellos en el agua
  for (let i = 0; i < 70; i++) {
    const t = Math.pow(r(), 1.5);
    const y = horizon + t * (ph - horizon);
    const x = r() * pw;
    const len = (30 + t * 170 + r() * 60) * dpr;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(len / 20, (0.5 + t * 1.2) * dpr * 0.35);
    softBlob(ctx, 0, 0, 20, [255, 255, 255], 0.22 + r() * 0.3);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(pw / 2, ph * 0.55, Math.min(pw, ph) * 0.35, pw / 2, ph * 0.55, Math.max(pw, ph) * 0.75);
  vig.addColorStop(0, 'rgba(0,30,80,0)');
  vig.addColorStop(1, 'rgba(0,30,80,.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, pw, ph);
  return c;
}

/** composición estática de la isla para la portada, con los mismos dibujos del juego. */
export async function renderIslandComposite(): Promise<HTMLCanvasElement> {
  const ground = renderGround();
  const out = makeCanvas(ground.width, ground.height + 220 * S);
  const ctx = out.getContext('2d')!;
  const ox = out.width / 2;
  const oy = 220 * S + ground.height / 2;
  ctx.drawImage(ground, 0, 220 * S);
  const layout: PlacedObject[] = [
    { id: 'a', assetId: 'pabellon', x: 520, y: 420, scale: 1, rotation: 0 },
    { id: 'b', assetId: 'palmera', x: 360, y: 450, scale: 1.1, rotation: 0 },
    { id: 'c', assetId: 'arbol', x: 290, y: 560, scale: 1, rotation: 1 },
    { id: 'd', assetId: 'fuente', x: 610, y: 560, scale: 1, rotation: 0 },
    { id: 'e', assetId: 'cristal', x: 720, y: 500, scale: 1, rotation: 0 },
    { id: 'f', assetId: 'roca', x: 430, y: 610, scale: 1, rotation: 0 },
    { id: 'g', assetId: 'flores', x: 520, y: 640, scale: 1, rotation: 0 },
    { id: 'h', assetId: 'palmera', x: 680, y: 450, scale: 0.9, rotation: 1 },
  ];
  layout.sort((a, b) => a.y - b.y);
  for (const o of layout) {
    const item = CATALOG_MAP.get(o.assetId)!;
    const sprite = await pencilSprite(item.assetPath);
    const p = project(o.x, o.y);
    const size = item.spriteSize * o.scale * S;
    const x = ox + p.x * S;
    const y = oy + p.y * S;
    ctx.save();
    ctx.translate(x, y);
    if (o.rotation % 2) ctx.scale(-1, 1);
    ctx.drawImage(sprite, -size / 2, -size * item.anchorY, size, size);
    ctx.restore();
  }
  return out;
}
