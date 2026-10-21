/** aero royale: dibujo de la arena en canvas 2d, con el mismo lenguaje de cristal, burbujas y agua del resto del juego. */
import { causticsTile, glassBubble, softBlob } from '../../art/aero';
import { makeCanvas, rng } from '../../art/pencil';
import { avatarDataUrl } from '../../avatar/svg';
import type { AvatarSpec } from '../../avatar/model';
import { ARENA_R, BULLET_R, MAX_HP, PLAYER_R, zoneAt, zoneCenter, type Match, type PickupKind, type Player } from './sim';

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; hue: number }
export interface FloatText { x: number; y: number; text: string; life: number; color: string }
export interface Fx { parts: Particle[]; floats: FloatText[]; flash: Record<string, number>; shake: number }
export const newFx = (): Fx => ({ parts: [], floats: [], flash: {}, shake: 0 });

export const pickupColor: Record<PickupKind, [string, string, string]> = {
  heart: ['#ffd0e4', '#ff5c9a', '♥'],
  shield: ['#d0f0ff', '#2c9cf0', '◆'],
  rapid: ['#fff4b8', '#ffb400', '»'],
  speed: ['#d8ffc0', '#3cc83c', '≫'],
};

export function burst(fx: Fx, x: number, y: number, hue: number, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const s = 80 + Math.random() * 190;
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + Math.random() * 0.5, max: 1.1, r: 4 + Math.random() * 7, hue });
  }
}

export function stepFx(fx: Fx, dt: number) {
  for (let i = fx.parts.length - 1; i >= 0; i--) {
    const p = fx.parts[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.life <= 0) fx.parts.splice(i, 1);
  }
  for (let i = fx.floats.length - 1; i >= 0; i--) {
    const f = fx.floats[i];
    f.life -= dt;
    f.y -= 38 * dt;
    if (f.life <= 0) fx.floats.splice(i, 1);
  }
  for (const k of Object.keys(fx.flash)) fx.flash[k] = Math.max(0, fx.flash[k] - dt * 3.5);
  fx.shake = Math.max(0, fx.shake - dt * 22);
}

/** recursos que se dibujan una sola vez: césped, cáusticas, burbuja y rostros. */
export class RoyaleArt {
  private ground: HTMLCanvasElement | null = null;
  private caustics = causticsTile(256);
  readonly bubble = glassBubble(96, { seed: 5 });
  private heads = new Map<string, HTMLImageElement>();

  constructor(private seed: number) {}

  head(id: string, spec: AvatarSpec | null): HTMLImageElement | null {
    let img = this.heads.get(id);
    if (!img && spec) {
      img = new Image();
      img.src = avatarDataUrl(spec, 'cabeza');
      this.heads.set(id, img);
    }
    return img && img.complete && img.naturalWidth ? img : null;
  }

  /** la isla de cristal: césped con luz, borde de arena y flores, dibujada una vez a media resolución. */
  private makeGround(): HTMLCanvasElement {
    const S = 0.6;
    const size = Math.ceil((ARENA_R + 150) * 2 * S);
    const c = makeCanvas(size, size);
    const g = c.getContext('2d')!;
    const mid = size / 2;
    const r = rng(this.seed + 11);
    g.save();
    g.filter = 'blur(10px)';
    g.fillStyle = 'rgba(4,44,92,.35)';
    g.beginPath();
    g.arc(mid, mid + 14, (ARENA_R + 50) * S, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const sand = g.createRadialGradient(mid - 120, mid - 140, 20, mid, mid, (ARENA_R + 50) * S);
    sand.addColorStop(0, '#fff3c8');
    sand.addColorStop(1, '#dcb56a');
    g.fillStyle = sand;
    g.beginPath();
    g.arc(mid, mid, (ARENA_R + 50) * S, 0, Math.PI * 2);
    g.fill();
    const grass = g.createRadialGradient(mid - 200, mid - 220, 20, mid, mid, ARENA_R * S);
    grass.addColorStop(0, '#b7ef6a');
    grass.addColorStop(0.5, '#7ccd3e');
    grass.addColorStop(1, '#3f9a2c');
    g.fillStyle = grass;
    g.beginPath();
    g.arc(mid, mid, ARENA_R * S, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(mid, mid, ARENA_R * S, 0, Math.PI * 2);
    g.clip();
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * ARENA_R * S;
      softBlob(g, mid + Math.cos(a) * d, mid + Math.sin(a) * d, 40 + r() * 80, r() < 0.5 ? [30, 110, 40] : [230, 255, 140], 0.22);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 1400; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * ARENA_R * S;
      const x = mid + Math.cos(a) * d;
      const y = mid + Math.sin(a) * d;
      g.strokeStyle = r() < 0.5 ? 'rgba(36,110,36,.6)' : 'rgba(190,245,110,.8)';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 6, y - 5 - r() * 7);
      g.stroke();
    }
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * ARENA_R * S * 0.97;
      g.fillStyle = ['#ffffff', '#ffe46a', '#ff9ac4', '#c6a8ff'][Math.floor(r() * 4)];
      g.beginPath();
      g.arc(mid + Math.cos(a) * d, mid + Math.sin(a) * d, 2 + r() * 2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    const edge = g.createLinearGradient(0, 0, size, size);
    edge.addColorStop(0, 'rgba(255,255,255,.95)');
    edge.addColorStop(0.5, 'rgba(255,255,255,.1)');
    edge.addColorStop(1, 'rgba(10,70,40,.7)');
    g.strokeStyle = edge;
    g.lineWidth = 7;
    g.beginPath();
    g.arc(mid, mid, ARENA_R * S, 0, Math.PI * 2);
    g.stroke();
    return c;
  }

  groundCanvas(): HTMLCanvasElement {
    this.ground ??= this.makeGround();
    return this.ground;
  }

  causticsPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
    return ctx.createPattern(this.caustics, 'repeat');
  }
}

export interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  m: Match;
  focus: { x: number; y: number };
  zoom: number;
  art: RoyaleArt;
  fx: Fx;
  specs: Record<string, AvatarSpec | null>;
  me: string;
  time: number;
}

export function draw(a: DrawArgs) {
  const { ctx, w, h, m, focus, zoom, art, fx, time } = a;
  const shakeX = (Math.random() - 0.5) * fx.shake;
  const shakeY = (Math.random() - 0.5) * fx.shake;
  const ox = w / 2 - focus.x * zoom + shakeX;
  const oy = h / 2 - focus.y * zoom + shakeY;

  // agua
  const sea = ctx.createLinearGradient(0, 0, 0, h);
  sea.addColorStop(0, '#5cc4ec');
  sea.addColorStop(0.5, '#2a8ad0');
  sea.addColorStop(1, '#14589a');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, w, h);
  const pat = art.causticsPattern(ctx);
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.translate(ox * 0.6 + time * 14, oy * 0.6 + time * 8);
    ctx.fillStyle = pat;
    ctx.fillRect(-ox * 0.6 - time * 14, -oy * 0.6 - time * 8, w, h);
    ctx.restore();
  }

  // isla
  const gc = art.groundCanvas();
  const gs = (gc.width / 0.6) * zoom;
  ctx.drawImage(gc, ox - gs / 2, oy - gs / 2, gs, gs);

  // zona segura y opacidad (gris) fuera de ella
  const z = zoneAt(m.t);
  const c = zoneCenter(m.seed, z.phase);
  const zx = ox + c.x * zoom;
  const zy = oy + c.y * zoom;
  const zr = z.radius * zoom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(zx, zy, Math.max(1, zr), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(118,128,140,.62)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(190,250,255,.95)';
  ctx.shadowColor = '#7fe8ff';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(zx, zy, Math.max(1, zr), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // objetos
  for (const k of m.pickups) {
    const [light, dark, glyph] = pickupColor[k.kind];
    const px = ox + k.x * zoom;
    const py = oy + k.y * zoom + Math.sin(time * 3 + k.id) * 3 * zoom;
    const rad = 17 * zoom;
    const gr = ctx.createRadialGradient(px - rad * 0.3, py - rad * 0.35, 1, px, py, rad);
    gr.addColorStop(0, '#fff');
    gr.addColorStop(0.35, light);
    gr.addColorStop(1, dark);
    ctx.save();
    ctx.shadowColor = dark;
    ctx.shadowBlur = 14;
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(17 * zoom)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, px, py + 1);
  }

  // jugadores (los vivos, de atrás hacia adelante)
  const ordered = [...m.players].filter((p) => p.alive).sort((p, q) => p.y - q.y);
  for (const p of ordered) drawPlayer(ctx, p, ox, oy, zoom, a);

  // burbujas disparadas
  for (const b of m.bullets) {
    const bx = ox + b.x * zoom;
    const by = oy + b.y * zoom;
    const s = BULLET_R * 2.6 * zoom;
    ctx.globalAlpha = Math.min(1, b.life * 4);
    ctx.drawImage(art.bubble, bx - s / 2, by - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  // partículas y números
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = `hsl(${p.hue} 90% 75%)`;
    ctx.beginPath();
    ctx.arc(ox + p.x * zoom, oy + p.y * zoom, p.r * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = `800 ${Math.round(16 * zoom)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const f of fx.floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,40,90,.7)';
    ctx.strokeText(f.text, ox + f.x * zoom, oy + f.y * zoom);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, ox + f.x * zoom, oy + f.y * zoom);
  }
  ctx.globalAlpha = 1;

  // luz: viñeta suave, y bruma gris más fuerte cuando la zona está cerrándose
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,30,90,0)');
  v.addColorStop(1, 'rgba(0,30,90,.34)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, ox: number, oy: number, zoom: number, a: DrawArgs) {
  const x = ox + p.x * zoom;
  const y = oy + p.y * zoom;
  const R = PLAYER_R * zoom;
  const mine = p.id === a.me;
  // sombra
  ctx.fillStyle = 'rgba(0,50,90,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.95, R * 0.95, R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // anillo del color del jugador y escudo
  ctx.save();
  ctx.shadowColor = `hsl(${p.hue} 90% 60%)`;
  ctx.shadowBlur = mine ? 20 : 10;
  ctx.fillStyle = `hsl(${p.hue} 80% 62%)`;
  ctx.beginPath();
  ctx.arc(x, y, R + 4 * zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // rostro dentro del cristal
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createRadialGradient(x - R * 0.3, y - R * 0.4, 1, x, y, R);
  bg.addColorStop(0, '#f4fdff');
  bg.addColorStop(1, '#a9dcf6');
  ctx.fillStyle = bg;
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  const img = a.art.head(p.id, a.specs[p.id] ?? null);
  if (img) ctx.drawImage(img, x - R * 0.98, y - R * 0.98, R * 1.96, R * 1.96);
  ctx.restore();
  // brillo de cristal
  const gl = ctx.createLinearGradient(x, y - R, x, y + R * 0.2);
  gl.addColorStop(0, 'rgba(255,255,255,.7)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(x - R * 0.1, y - R * 0.5, R * 0.7, R * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(90,200,255,.9)';
    ctx.lineWidth = 4;
    ctx.setLineDash([6 * zoom, 4 * zoom]);
    ctx.beginPath();
    ctx.arc(x, y, R + 9 * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // cañón de burbujas
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.aim);
  ctx.fillStyle = `hsl(${p.hue} 75% 45%)`;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(R * 0.9, -4 * zoom, 12 * zoom, 8 * zoom, 4 * zoom);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // destello al recibir daño
  const fl = a.fx.flash[p.id] ?? 0;
  if (fl > 0) {
    ctx.fillStyle = `rgba(255,90,90,${fl * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
  }
  // vida y nombre
  const bw = 54 * zoom;
  const by = y - R - 16 * zoom;
  ctx.fillStyle = 'rgba(0,40,80,.55)';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, by, bw, 7 * zoom, 4 * zoom);
  ctx.fill();
  const frac = Math.max(0, p.hp / MAX_HP);
  ctx.fillStyle = frac > 0.55 ? '#5cd84a' : frac > 0.28 ? '#ffc02a' : '#ff5a4a';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2 + 1, by + 1, Math.max(2, (bw - 2) * frac), 5 * zoom, 3 * zoom);
  ctx.fill();
  ctx.font = `700 ${Math.round(11 * zoom)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,40,90,.7)';
  ctx.strokeText(p.name, x, by - 4 * zoom);
  ctx.fillStyle = mine ? '#d8ff90' : '#fff';
  ctx.fillText(p.name, x, by - 4 * zoom);
}

/** minimapa: la arena, la zona y los jugadores como puntos. */
export function drawMinimap(ctx: CanvasRenderingContext2D, size: number, m: Match, me: string) {
  ctx.clearRect(0, 0, size, size);
  const s = size / 2 / (ARENA_R + 80);
  const mid = size / 2;
  ctx.fillStyle = 'rgba(40,130,200,.55)';
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,200,70,.9)';
  ctx.beginPath();
  ctx.arc(mid, mid, ARENA_R * s, 0, Math.PI * 2);
  ctx.fill();
  const z = zoneAt(m.t);
  const c = zoneCenter(m.seed, z.phase);
  ctx.save();
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(mid + c.x * s, mid + c.y * s, Math.max(1, z.radius * s), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(110,120,132,.7)';
  ctx.fill('evenodd');
  ctx.restore();
  for (const p of m.players) {
    if (!p.alive) continue;
    ctx.fillStyle = p.id === me ? '#fff' : `hsl(${p.hue} 85% 60%)`;
    ctx.beginPath();
    ctx.arc(mid + p.x * s, mid + p.y * s, p.id === me ? 4 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.stroke();
}
