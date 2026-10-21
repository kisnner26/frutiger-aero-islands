/** dibujo en primera persona de paintball royale: suelo en perspectiva, cobertura y jugadores como carteles, arma y salpicaduras. */
import { avatarDataUrl } from '../../avatar/svg';
import type { AvatarSpec } from '../../avatar/model';
import { CATALOG_MAP } from '../../catalog/catalog';
import { loadImage, pencilSprite } from '../../art/pencil';
import { ARENA_R, BODY_R, MAX_AMMO, MAX_HP, dirOf, rightOf, type Match, type Player, type Zone } from './sim';

export const EYE = 118;
const FOG_END = 1500;
const SKY: [number, number, number] = [92, 170, 236];
const HAZE: [number, number, number] = [200, 236, 252];
const SMOG: [number, number, number] = [120, 128, 136];

export interface Splat { x: number; y: number; hue: number; r: number; t: number }
export interface Fx { splats: Splat[]; tracers: Array<{ x0: number; y0: number; x1: number; y1: number; hue: number; t: number }>; screen: Array<{ x: number; y: number; hue: number; r: number; t: number }>; hitMarker: number; shake: number }
export const newFx = (): Fx => ({ splats: [], tracers: [], screen: [], hitMarker: 0, shake: 0 });

export const hsl = (h: number, s = 80, l = 55, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

function makeTile(): Uint8Array {
  const n = 128;
  const t = new Uint8Array(n * n);
  let s = 4321;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const base = new Float32Array(16 * 16).map(() => rnd());
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const fx = (x / n) * 16;
      const fy = (y / n) * 16;
      const x0 = Math.floor(fx) % 16;
      const y0 = Math.floor(fy) % 16;
      const tx = fx - Math.floor(fx);
      const ty = fy - Math.floor(fy);
      const a = base[y0 * 16 + x0] * (1 - tx) + base[y0 * 16 + ((x0 + 1) % 16)] * tx;
      const b = base[((y0 + 1) % 16) * 16 + x0] * (1 - tx) + base[((y0 + 1) % 16) * 16 + ((x0 + 1) % 16)] * tx;
      t[y * n + x] = Math.round((a * (1 - ty) + b * ty) * 255 * 0.7 + rnd() * 255 * 0.3);
    }
  return t;
}

/** imágenes que usa la partida: cobertura del catálogo y un rostro por jugador. */
export class PbArt {
  tile = makeTile();
  sprites = new Map<string, HTMLCanvasElement>();
  avatars = new Map<string, HTMLCanvasElement>();
  buf = document.createElement('canvas');

  async load(kinds: string[]): Promise<void> {
    await Promise.all(
      kinds.map(async (k) => {
        const item = CATALOG_MAP.get(k);
        if (!item || this.sprites.has(k)) return;
        try {
          this.sprites.set(k, await pencilSprite(item.assetPath));
        } catch {
          /* sin esa imagen se dibuja un óvalo */
        }
      }),
    );
  }

  async setAvatar(id: string, spec: AvatarSpec | null): Promise<void> {
    if (!spec || this.avatars.has(id)) return;
    try {
      const img = await loadImage(avatarDataUrl(spec, 'completo'));
      const c = document.createElement('canvas');
      c.width = 150;
      c.height = 250;
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      this.avatars.set(id, c);
    } catch {
      /* se dibuja un orbe de color */
    }
  }
}

function toCam(px: number, py: number, cam: { x: number; y: number; h: number }) {
  const d = dirOf(cam.h);
  const r = rightOf(cam.h);
  const dx = px - cam.x;
  const dy = py - cam.y;
  return { depth: dx * d.x + dy * d.y, lateral: dx * r.x + dy * r.y };
}

export interface View { ctx: CanvasRenderingContext2D; W: number; H: number; time: number; reduced: boolean }

/** escena completa vista por `me`. */
export function drawScene(v: View, art: PbArt, m: Match, me: Player, zone: Zone, fx: Fx, bob: number) {
  const { ctx, W, H } = v;
  const f = H * 0.95;
  const hy = H * 0.44;
  const camH = EYE + bob;
  const cam = { x: me.x, y: me.y, h: me.heading };
  const shake = v.reduced ? 0 : fx.shake;
  ctx.save();
  if (shake > 0.02) ctx.translate((Math.random() - 0.5) * shake * 9, (Math.random() - 0.5) * shake * 9);

  // cielo y colinas
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, `rgb(${SKY})`);
  sky.addColorStop(1, `rgb(${HAZE})`);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, W + 40, hy + 22);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (let i = 0; i < 6; i++) {
    let dx = (((i * 1.05 + 0.4 - me.heading) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
    if (Math.abs(dx) > 0.95) continue;
    const cx = W / 2 + dx * f * 1.05;
    const cy = hy * (0.2 + (i % 3) * 0.2);
    for (const [ox, oy, r] of [[0, 0, 26], [28, 6, 20], [-28, 8, 18]] as const) {
      ctx.beginPath();
      ctx.arc(cx + ox, cy + oy, r * (W / 900 + 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    dx = 0;
  }
  // suelo en perspectiva (buffer pequeño)
  const buf = art.buf;
  const bw = Math.max(160, Math.round(W / 3));
  const bh = Math.max(90, Math.round(H / 3));
  if (buf.width !== bw || buf.height !== bh) {
    buf.width = bw;
    buf.height = bh;
  }
  const bctx = buf.getContext('2d')!;
  const img = bctx.createImageData(bw, bh);
  const px = img.data;
  const bhy = (hy / H) * bh;
  const bf = (f / H) * bh;
  const dd = dirOf(cam.h);
  const rr = rightOf(cam.h);
  for (let y = Math.max(0, Math.floor(bhy) + 1); y < bh; y++) {
    const dist = (camH * bf) / (y - bhy);
    const fog = Math.min(1, dist / FOG_END);
    const stepL = dist / bf;
    let wx = cam.x + dd.x * dist - rr.x * stepL * (bw / 2);
    let wy = cam.y + dd.y * dist - rr.y * stepL * (bw / 2);
    const sx = rr.x * stepL;
    const sy = rr.y * stepL;
    for (let x = 0; x < bw; x++, wx += sx, wy += sy) {
      const rad = Math.hypot(wx, wy);
      const n = art.tile[(((wy * 0.35) | 0) & 127) * 128 + (((wx * 0.35) | 0) & 127)] / 255;
      let cr: number, cg: number, cb: number;
      if (rad <= ARENA_R) {
        cr = 92 + n * 70;
        cg = 170 + n * 50;
        cb = 62 + n * 30;
      } else if (rad <= ARENA_R + 40) {
        cr = 238 - n * 24;
        cg = 218 - n * 26;
        cb = 164 - n * 24;
      } else {
        const rip = v.reduced ? 0 : Math.sin(wx * 0.05 + v.time * 1.4) * Math.sin(wy * 0.045 - v.time * 1.1);
        cr = 40 + n * 20 + rip * 14;
        cg = 140 + n * 22 + rip * 18;
        cb = 210 + n * 16 + rip * 16;
      }
      // la opacidad gris cubre lo que queda fuera de la zona segura; el borde brilla
      const zd = Math.hypot(wx - zone.x, wy - zone.y) - zone.r;
      if (zd > 0) {
        const k = Math.min(0.72, 0.28 + zd / 160);
        cr += (SMOG[0] - cr) * k;
        cg += (SMOG[1] - cg) * k;
        cb += (SMOG[2] - cb) * k;
      } else if (zd > -5) {
        cr = 255;
        cg = 255;
        cb = 255;
      }
      const o = (y * bw + x) * 4;
      px[o] = cr + (HAZE[0] - cr) * fog;
      px[o + 1] = cg + (HAZE[1] - cg) * fog;
      px[o + 2] = cb + (HAZE[2] - cb) * fog;
      px[o + 3] = 255;
    }
  }
  bctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(buf, 0, 0, bw, bh, -2, -2, W + 4, H + 4);

  // salpicaduras de pintura en el suelo
  for (const s of fx.splats) {
    const { depth, lateral } = toCam(s.x, s.y, cam);
    if (depth < 25 || depth > 1100) continue;
    const sc = f / depth;
    const sxp = W / 2 + lateral * sc;
    const syp = hy + camH * sc;
    const rx = s.r * sc;
    if (sxp + rx < 0 || sxp - rx > W) continue;
    ctx.fillStyle = hsl(s.hue, 85, 55, Math.min(0.85, s.t));
    ctx.beginPath();
    ctx.ellipse(sxp, syp, rx, rx * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hsl(s.hue, 90, 75, Math.min(0.6, s.t));
    ctx.beginPath();
    ctx.ellipse(sxp - rx * 0.2, syp - rx * 0.03, rx * 0.35, rx * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // carteles: cobertura y jugadores, de lejos a cerca
  type Item = { depth: number; draw: () => void };
  const items: Item[] = [];
  const billboard = (img2: HTMLCanvasElement | undefined, wx: number, wy: number, worldH: number, ratio: number, fallback: () => void, flip = 1, tint?: string) => {
    const { depth, lateral } = toCam(wx, wy, cam);
    if (depth < 24 || depth > FOG_END) return;
    const sc = f / depth;
    const hpx = worldH * sc;
    const wpx = hpx * ratio;
    const sxp = W / 2 + lateral * sc;
    if (sxp + wpx < -60 || sxp - wpx > W + 60) return;
    const syp = hy + camH * sc;
    items.push({
      depth,
      draw: () => {
        const fog = Math.min(1, depth / FOG_END);
        ctx.save();
        ctx.globalAlpha = 1 - fog * 0.55;
        ctx.translate(sxp, syp);
        ctx.fillStyle = 'rgba(20,50,30,.22)';
        ctx.beginPath();
        ctx.ellipse(0, 0, wpx * 0.34, Math.max(2, hpx * 0.045), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.scale(flip, 1);
        if (img2) {
          ctx.drawImage(img2, -wpx / 2, -hpx, wpx, hpx);
          if (tint) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = tint;
            ctx.fillRect(-wpx / 2, -hpx * 0.55, wpx, hpx * 0.3);
          }
        } else {
          ctx.scale(wpx, hpx);
          fallback();
        }
        ctx.restore();
      },
    });
  };
  for (const o of m.obstacles) billboard(art.sprites.get(o.kind), o.x, o.y, o.h, 1, () => {
    ctx.fillStyle = '#6a9a58';
    ctx.beginPath();
    ctx.ellipse(0, -0.5, 0.4, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  for (const p of m.players) {
    if (!p.alive || p.id === me.id) continue;
    const { depth, lateral } = toCam(p.x, p.y, cam);
    billboard(art.avatars.get(p.id), p.x, p.y, 150, 0.6, () => {
      ctx.fillStyle = hsl(p.hue, 70, 55);
      ctx.beginPath();
      ctx.ellipse(0, -0.55, 0.42, 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-0.15, -0.62, 0.1, 0.1);
      ctx.fillRect(0.05, -0.62, 0.1, 0.1);
    }, 1, hsl(p.hue, 85, 55, 0.55));
    // nombre y barra de vida sobre la cabeza
    if (depth > 24 && depth < 650) {
      const sc = f / depth;
      const sxp = W / 2 + lateral * sc;
      const syp = hy + camH * sc - 165 * sc;
      items.push({
        depth: depth - 0.5,
        draw: () => {
          ctx.font = `800 ${Math.max(11, 15 * Math.min(1.4, sc * 3))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(8,60,110,.8)';
          ctx.strokeText(p.name, sxp, syp - 8);
          ctx.fillStyle = '#fff';
          ctx.fillText(p.name, sxp, syp - 8);
          const w = 38 * Math.min(1.4, sc * 3);
          for (let i = 0; i < MAX_HP; i++) {
            ctx.fillStyle = i < p.hp ? hsl(p.hue, 85, 58) : 'rgba(255,255,255,.35)';
            ctx.beginPath();
            ctx.arc(sxp + (i - 1) * (w / 3 + 3), syp + 3, Math.max(3, w / 8), 0, Math.PI * 2);
            ctx.fill();
          }
        },
      });
    }
  }
  items.sort((a, b) => b.depth - a.depth).forEach((it) => it.draw());

  // trazos de pintura en vuelo
  for (const t of fx.tracers) {
    const a = toCam(t.x0, t.y0, cam);
    const b = toCam(t.x1, t.y1, cam);
    if (b.depth < 20) continue;
    const pa = a.depth > 20 ? { x: W / 2 + (a.lateral * f) / a.depth, y: hy + (camH * f) / a.depth - 70 * (f / a.depth) } : { x: W * 0.72, y: H * 0.86 };
    const pb = { x: W / 2 + (b.lateral * f) / b.depth, y: hy + (camH * f) / b.depth - 80 * (f / b.depth) };
    ctx.strokeStyle = hsl(t.hue, 90, 60, Math.min(1, t.t * 6));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.restore();

  // manchas de pintura en la pantalla cuando te alcanzan
  for (const s of fx.screen) {
    ctx.fillStyle = hsl(s.hue, 85, 55, Math.min(0.8, s.t * 1.4));
    ctx.beginPath();
    ctx.ellipse(s.x * W, s.y * H, s.r * W * 0.5, s.r * W * 0.38, s.x * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (me.hurt < 0.25) {
    ctx.fillStyle = `rgba(255,80,60,${0.3 * (1 - me.hurt / 0.25)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // fuera de la zona: viñeta gris
  if (Math.hypot(me.x - zone.x, me.y - zone.y) > zone.r) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(110,118,126,0)');
    g.addColorStop(1, 'rgba(90,98,106,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/** mira y arma en primera persona. */
export function drawWeapon(v: View, me: Player, bob: number, moving: number) {
  const { ctx, W, H } = v;
  const cx = W / 2;
  const cy = H * 0.44;
  // mira
  const gap = 7 + (me.cd > 0 ? 5 : 0);
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(0,50,100,.7)';
  ctx.shadowBlur = 3;
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    ctx.moveTo(cx + dx * gap, cy + dy * gap);
    ctx.lineTo(cx + dx * (gap + 9), cy + dy * (gap + 9));
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  // marcadora
  const k = Math.min(W, H * 1.6) / 1100;
  const recoil = me.flash > 0 ? 16 * (me.flash / 0.12) : 0;
  const sway = v.reduced ? 0 : Math.sin(v.time * 9) * 4 * moving;
  ctx.save();
  ctx.translate(W * 0.74 + sway * k, H * 1.02 + bob * 2 + recoil * k);
  ctx.scale(k, k);
  ctx.rotate(-0.06);
  const body = hsl(me.hue, 70, 52);
  // depósito de bolas
  ctx.fillStyle = hsl(me.hue, 85, 62);
  ctx.strokeStyle = '#0a3a66';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(-40, -250, 56, 44, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-58, -262, 20, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // cuerpo
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-110, -230, 200, 120, 26);
  ctx.fill();
  ctx.stroke();
  // cañón
  ctx.fillStyle = '#dfe8ee';
  ctx.beginPath();
  ctx.roundRect(-40, -330, 38, 120, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a4a66';
  ctx.beginPath();
  ctx.roundRect(-44, -346, 46, 28, 8);
  ctx.fill();
  ctx.stroke();
  // mango
  ctx.fillStyle = '#2a3a4a';
  ctx.beginPath();
  ctx.roundRect(-20, -120, 54, 130, 14);
  ctx.fill();
  ctx.stroke();
  if (me.flash > 0) {
    ctx.fillStyle = hsl(me.hue, 95, 70, me.flash / 0.12);
    ctx.beginPath();
    ctx.arc(-21, -352, 34 * (1 + (1 - me.flash / 0.12)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** radar: arena, zona, tú y los rivales cercanos. */
export function drawRadar(ctx: CanvasRenderingContext2D, size: number, m: Match, me: Player, zone: Zone) {
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(210,240,255,.78)';
  ctx.fill();
  ctx.clip();
  const sc = (r - 4) / (ARENA_R + 40);
  ctx.fillStyle = '#7cc84a';
  ctx.beginPath();
  ctx.arc(r, r, ARENA_R * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(110,118,126,.55)';
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(r + zone.x * sc, r + zone.y * sc, zone.r * sc, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(r + zone.x * sc, r + zone.y * sc, zone.r * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#2f7a28';
  for (const o of m.obstacles) ctx.fillRect(r + o.x * sc - 1.5, r + o.y * sc - 1.5, 3, 3);
  for (const p of m.players) {
    if (!p.alive || p.id === me.id) continue;
    if (Math.hypot(p.x - me.x, p.y - me.y) > 360) continue;
    ctx.fillStyle = hsl(p.hue, 85, 55);
    ctx.beginPath();
    ctx.arc(r + p.x * sc, r + p.y * sc, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(r + me.x * sc, r + me.y * sc);
  ctx.rotate(me.heading);
  ctx.fillStyle = '#ffd23a';
  ctx.strokeStyle = '#a06a00';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const AMMO = MAX_AMMO;
export const BODY = BODY_R;
