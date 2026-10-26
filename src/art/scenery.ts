import { CATALOG_MAP } from '../catalog/catalog';
import { LAND_RADII, LAND_TIERS, landRadii, landTier, levelOfIndex } from '../domain/geometry';
import type { PlacedObject } from '../domain/island';
import { K, TILT, project } from '../engine/projection';
import { cloudCanvas, ridgeY, softBlob } from './aero';
import { ART_STYLE, hatch, makeCanvas, paperGrain, pencilSprite, rng, vnoise, wobbleEllipse } from './pencil';
import { timed } from '../perf';

/** metros de escena que cubre la textura del suelo: mitad de ancho y alto. */
export const GROUND_HALF = { w: 450, h: 230 };
const S = 2;

const ex = (rx: number) => rx * K * S;
const ey = (ry: number) => ry * K * TILT * S;

/** isla dibujada a lápiz: agua en torno, arena, hierba. centrada en el origen de la escena. */
const groundCache = new Map<number, HTMLCanvasElement>();

/** el terreno crece con el nivel; el lienzo mide siempre lo mismo y se redibuja al cambiar de tamaño. */
export function renderGround(requested = 1): HTMLCanvasElement {
  // los tamaños comprados reutilizan el arte del último tamaño dibujado
  const tier = Math.min(landTier(requested), LAND_TIERS.length - 1);
  const level = levelOfIndex(tier);
  const cached = groundCache.get(tier);
  if (cached) return cached;
  if (ART_STYLE === 'aero') {
    const aero = timed('art:suelo', () => renderGroundAero(level));
    groundCache.set(tier, aero);
    return aero;
  }
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

/** isla frutiger aero: césped suave con luz, borde de arena y roca con volumen, espuma y anillos de agua. */
function renderGroundAero(level: number): HTMLCanvasElement {
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
  const ell = (dy: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy + dy * S, rx, ry, 0, 0, Math.PI * 2);
  };
  const sandRx = ex(392 + grow);
  const sandRy = ey(312 + growY);

  // sombra suave y resplandor del agua alrededor
  ctx.save();
  ctx.filter = 'blur(22px)';
  ctx.fillStyle = 'rgba(4, 44, 92, .42)';
  ell(34, ex(404 + grow), ey(326 + growY));
  ctx.fill();
  ctx.restore();
  ctx.save();
  // elíptico y contenido dentro del lienzo, para que no se vean sus bordes
  ctx.translate(cx, cy + 8 * S);
  ctx.scale(1, sandRy / sandRx);
  const halo = ctx.createRadialGradient(0, 0, sandRx * 0.9, 0, 0, sandRx * 1.13);
  halo.addColorStop(0, 'rgba(190,245,255,0)');
  halo.addColorStop(0.3, 'rgba(190,245,255,.45)');
  halo.addColorStop(1, 'rgba(190,245,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, sandRx * 1.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // costado: roca y arena con estratos y volumen
  ctx.save();
  ell(24, sandRx, sandRy);
  const side = ctx.createLinearGradient(0, cy, 0, cy + sandRy + 28 * S);
  side.addColorStop(0, '#e9cd92');
  side.addColorStop(0.45, '#b9884a');
  side.addColorStop(1, '#6e4a26');
  ctx.fillStyle = side;
  ctx.fill();
  ctx.clip();
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) {
    ctx.strokeStyle = `rgba(90, 56, 24, ${0.1 + i * 0.03})`;
    ell(6 + i * 4.4, sandRx * (1 - i * 0.004), sandRy * (1 - i * 0.004));
    ctx.stroke();
  }
  const sideShade = ctx.createLinearGradient(cx - sandRx, 0, cx + sandRx, 0);
  sideShade.addColorStop(0, 'rgba(255,255,255,.22)');
  sideShade.addColorStop(0.5, 'rgba(255,255,255,0)');
  sideShade.addColorStop(1, 'rgba(20,30,70,.3)');
  ctx.fillStyle = sideShade;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // arena de la orilla
  ctx.save();
  ell(0, sandRx, sandRy);
  const sand = ctx.createRadialGradient(cx - ex(120), cy - ey(100), 10, cx, cy, sandRx);
  sand.addColorStop(0, '#fff3c8');
  sand.addColorStop(0.7, '#f1d794');
  sand.addColorStop(1, '#dcb56a');
  ctx.fillStyle = sand;
  ctx.fill();
  ctx.clip();
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(190,140,60,.25)';
    ctx.fillRect(cx + Math.cos(a) * sandRx * (0.9 + r() * 0.1), cy + Math.sin(a) * sandRy * (0.9 + r() * 0.1), 2.4, 2.4);
  }
  ctx.restore();

  // césped: degradado con luz, manchas suaves y rayas de corte
  ctx.save();
  ell(0, ex(land.rx), ey(land.ry));
  const grass = ctx.createRadialGradient(cx - ex(land.rx) * 0.35, cy - ey(land.ry) * 0.4, 20, cx, cy, ex(land.rx) * 1.05);
  grass.addColorStop(0, '#b7ef6a');
  grass.addColorStop(0.45, '#7ccd3e');
  grass.addColorStop(1, '#3f9a2c');
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.clip();
  // franjas anchas de cortacésped, muy suaves
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  for (let i = -6; i < 8; i++) {
    ctx.save();
    ctx.translate(cx + i * ex(70), cy);
    ctx.rotate(-0.5);
    ctx.fillRect(-ex(18), -H, ex(36), H * 2);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < Math.round(60 * area); i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.9;
    const px = cx + Math.cos(a) * d * ex(land.rx);
    const py = cy + Math.sin(a) * d * ey(land.ry);
    const rad = 50 + r() * 90;
    const g2 = ctx.createRadialGradient(px, py, 0, px, py, rad);
    g2.addColorStop(0, r() < 0.5 ? 'rgba(30,110,40,.22)' : 'rgba(230,255,140,.28)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  // brillo solar y viñeta interior
  const sun = ctx.createRadialGradient(cx - ex(130), cy - ey(120), 10, cx - ex(130), cy - ey(120), ex(260));
  sun.addColorStop(0, 'rgba(255,255,210,.5)');
  sun.addColorStop(1, 'rgba(255,255,210,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
  const rim = ctx.createRadialGradient(cx, cy, ex(land.rx) * 0.6, cx, cy, ex(land.rx));
  rim.addColorStop(0, 'rgba(20,90,40,0)');
  rim.addColorStop(1, 'rgba(20,90,40,.4)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, W, H);
  // briznas con degradado y flores diminutas
  ctx.lineCap = 'round';
  // brizna en dos pasadas con color sólido (base oscura y punta clara): mismo aspecto sin crear un degradado por brizna
  const blades = Math.round(900 * area);
  const bladeData: number[] = [];
  for (let i = 0; i < blades; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.96;
    bladeData.push(cx + Math.cos(a) * d * ex(land.rx), cy + Math.sin(a) * d * ey(land.ry), 8 + r() * 12, (r() - 0.5) * 10, 1.5 + r());
  }
  for (const [color, part] of [['rgba(36,110,36,.7)', 0.55], ['rgba(190,245,110,.9)', 1]] as const) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < blades; i++) {
      const [x, y, h, lean] = [bladeData[i * 5], bladeData[i * 5 + 1], bladeData[i * 5 + 2], bladeData[i * 5 + 3]];
      const from = part === 1 ? 0.5 : 0;
      ctx.moveTo(x + lean * from * 0.4, y - h * from);
      ctx.quadraticCurveTo(x + lean * 0.3, y - h * (part === 1 ? 0.8 : 0.5), x + lean * part, y - h * part);
    }
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (let i = 0; i < Math.round(46 * area); i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.9;
    const fx = cx + Math.cos(a) * d * ex(land.rx);
    const fy = cy + Math.sin(a) * d * ey(land.ry);
    ctx.fillStyle = ['#ffffff', '#ffe46a', '#ff9ac4', '#c6a8ff'][Math.floor(r() * 4)];
    ctx.beginPath();
    ctx.arc(fx, fy, 2.2 + r() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // luz de borde: arriba-izquierda clara, abajo-derecha en sombra
  ctx.save();
  const edgeG = ctx.createLinearGradient(cx - ex(land.rx), cy - ey(land.ry), cx + ex(land.rx), cy + ey(land.ry));
  edgeG.addColorStop(0, 'rgba(255,255,255,.95)');
  edgeG.addColorStop(0.5, 'rgba(255,255,255,.12)');
  edgeG.addColorStop(1, 'rgba(10,70,40,.7)');
  ctx.strokeStyle = edgeG;
  ctx.lineWidth = 5;
  ell(0, ex(land.rx), ey(land.ry));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,70,30,.55)';
  ctx.lineWidth = 2;
  ell(0, ex(land.rx) + 3, ey(land.ry) + 3);
  ctx.stroke();
  ctx.restore();

  // espuma suave y anillos de agua
  ctx.save();
  ctx.filter = 'blur(2px)';
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 6;
  ell(8, sandRx + 10, sandRy + 8);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  for (const [rx, ry, al] of [[430 + grow, 350 + growY, 0.7], [470 + grow, 385 + growY, 0.42], [515 + grow, 425 + growY, 0.22]] as const) {
    ctx.globalAlpha = al;
    ell(10, ex(rx), ey(ry));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

/** cielo, montañas y lago con reflejos, estilo frutiger aero. */
export function renderBackdrop(w: number, h: number, dpr: number): HTMLCanvasElement {
  return timed('art:fondo', () => renderBackdropImpl(w, h, dpr));
}

function renderBackdropImpl(w: number, h: number, dpr: number): HTMLCanvasElement {
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
  // haces de luz que parten del sol y destellos de lente
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const reach = Math.max(pw, ph) * 1.1;
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (0.06 + (i / 13) * 0.62) + (r() - 0.5) * 0.05;
    const half = 0.018 + r() * 0.03;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, reach);
    g.addColorStop(0, `rgba(255,255,235,${0.2 + r() * 0.14})`);
    g.addColorStop(0.5, 'rgba(255,255,235,.05)');
    g.addColorStop(1, 'rgba(255,255,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - half) * reach, sy + Math.sin(a - half) * reach);
    ctx.lineTo(sx + Math.cos(a + half) * reach, sy + Math.sin(a + half) * reach);
    ctx.closePath();
    ctx.fill();
  }
  const dx = pw / 2 - sx;
  const dy = ph * 0.45 - sy;
  for (const [t, rad, col] of [[0.35, 0.05, '255,255,200'], [0.55, 0.09, '170,240,255'], [0.8, 0.04, '255,210,255'], [1.15, 0.12, '190,255,220']] as const) {
    const fx = sx + dx * t;
    const fy = sy + dy * t;
    const rr = Math.min(pw, ph) * rad;
    const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr);
    fg.addColorStop(0, `rgba(${col},.28)`);
    fg.addColorStop(0.7, `rgba(${col},.1)`);
    fg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // disco solar
  const disc = ctx.createRadialGradient(sx, sy, 0, sx, sy, Math.min(pw, ph) * 0.03);
  disc.addColorStop(0, 'rgba(255,255,255,1)');
  disc.addColorStop(1, 'rgba(255,250,210,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sx, sy, Math.min(pw, ph) * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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
  // camino de destellos del sol sobre el agua
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(r(), 1.2);
    const y = horizon + t * (ph - horizon) * 0.8;
    const spread = (0.04 + t * 0.2) * pw;
    const x = sx + (r() - 0.5) * 2 * spread * (0.4 + r());
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((18 + r() * 40) * dpr / 20, (0.35 + t * 0.6) * dpr * 0.28);
    softBlob(ctx, 0, 0, 20, [255, 255, 245], 0.35 + r() * 0.4);
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
