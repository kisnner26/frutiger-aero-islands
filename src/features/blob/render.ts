/** aero blob: arena de agua clara, células de cristal con rostro, burbujas de comida, medusas y bruma gris. */
import type { AvatarSpec } from '../../avatar/model';
import { RoyaleArt, type Fx } from '../royale/render';
import { ARENA, hazeRadius, radiusOf, totalMass, type Match, type PowerKind } from './sim';

export const powerInfo: Record<PowerKind, { glyph: string; color: string; name: [string, string] }> = {
  dash: { glyph: '»', color: '#ffb400', name: ['impulso', 'dash'] },
  shield: { glyph: '◆', color: '#2c9cf0', name: ['escudo', 'shield'] },
  magnet: { glyph: '◎', color: '#c050ff', name: ['imán', 'magnet'] },
  freeze: { glyph: '✱', color: '#6adcf0', name: ['congelar', 'freeze'] },
  burst: { glyph: '✺', color: '#ff6a4a', name: ['estallido', 'burst'] },
  feast: { glyph: '★', color: '#3cc83c', name: ['festín', 'feast'] },
};

export interface BlobDraw {
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

export function drawBlob(a: BlobDraw) {
  const { ctx, w, h, m, focus, zoom, art, fx, time } = a;
  const ox = w / 2 - focus.x * zoom + (Math.random() - 0.5) * fx.shake;
  const oy = h / 2 - focus.y * zoom + (Math.random() - 0.5) * fx.shake;
  const X = (x: number) => ox + x * zoom;
  const Y = (y: number) => oy + y * zoom;

  // fuera de la arena: agua profunda
  const deep = ctx.createLinearGradient(0, 0, 0, h);
  deep.addColorStop(0, '#2a8ad0');
  deep.addColorStop(1, '#0f4a8a');
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);
  const pat = art.causticsPattern(ctx);
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.translate(ox * 0.7 + time * 10, oy * 0.7 + time * 6);
    ctx.fillStyle = pat;
    ctx.fillRect(-ox * 0.7 - time * 10, -oy * 0.7 - time * 6, w, h);
    ctx.restore();
  }

  // suelo de la arena: agua clara con anillos y haces
  const floor = ctx.createRadialGradient(X(-300), Y(-400), 10, X(0), Y(0), ARENA * zoom);
  floor.addColorStop(0, '#e6fbff');
  floor.addColorStop(0.55, '#8fdcf6');
  floor.addColorStop(1, '#4cb4e6');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), ARENA * zoom, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(X(0), Y(0), ARENA * zoom, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  for (let r = 300; r < ARENA; r += 300) {
    ctx.beginPath();
    ctx.arc(X(0), Y(0), r * zoom, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(Math.cos(ang) * ARENA), Y(Math.sin(ang) * ARENA));
    ctx.stroke();
  }
  if (pat) {
    ctx.globalAlpha = 0.35;
    ctx.translate(ox + time * 8, oy + time * 5);
    ctx.fillStyle = pat;
    ctx.fillRect(-ox - time * 8, -oy - time * 5, w, h);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), ARENA * zoom, 0, Math.PI * 2);
  ctx.stroke();

  const vx0 = -ox / zoom - 50;
  const vy0 = -oy / zoom - 50;
  const vx1 = (w - ox) / zoom + 50;
  const vy1 = (h - oy) / zoom + 50;
  const seen = (x: number, y: number, r = 0) => x + r > vx0 && x - r < vx1 && y + r > vy0 && y - r < vy1;

  // burbujas de comida y masa suelta
  for (const p of m.pellets) {
    if (!seen(p.x, p.y, 8)) continue;
    const r = 5.5 * zoom;
    const g = ctx.createRadialGradient(X(p.x) - r * 0.3, Y(p.y) - r * 0.35, 0.5, X(p.x), Y(p.y), r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, `hsl(${p.hue} 90% 72%)`);
    g.addColorStop(1, `hsl(${p.hue} 85% 50%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of m.ejected) {
    if (!seen(p.x, p.y, 16)) continue;
    ctx.fillStyle = `hsl(${p.hue} 85% 62%)`;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), Math.max(5, radiusOf(p.mass) * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // poderes
  for (const k of m.pickups) {
    if (!seen(k.x, k.y, 40)) continue;
    const info = powerInfo[k.kind];
    const px = X(k.x);
    const py = Y(k.y) + Math.sin(time * 3 + k.id) * 4 * zoom;
    const r = 20 * zoom;
    const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.35, 1, px, py, r);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, info.color);
    g.addColorStop(1, info.color);
    ctx.save();
    ctx.shadowColor = info.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${Math.round(20 * zoom)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.glyph, px, py + 1);
  }

  // medusas (pinchan a las células grandes)
  for (const j of m.jellies) {
    if (!seen(j.x, j.y, 70)) continue;
    const r = radiusOf(j.mass) * zoom;
    const px = X(j.x);
    const py = Y(j.y);
    const pulse = 1 + Math.sin(time * 4 + j.id) * 0.05;
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = 'rgba(170,90,230,.85)';
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const rr = (i % 2 ? r * 1.22 : r) * pulse;
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // células, de menor a mayor para que las grandes cubran a las pequeñas
  const all = m.players.filter((p) => p.alive).flatMap((p) => p.cells.map((c) => ({ p, c })));
  all.sort((u, v) => u.c.mass - v.c.mass);
  for (const { p, c } of all) {
    if (!seen(c.x, c.y, radiusOf(c.mass) + 30)) continue;
    drawCell(ctx, a, p, c.x, c.y, radiusOf(c.mass), X, Y, c.mass);
  }

  // efectos
  for (const q of fx.parts) {
    ctx.globalAlpha = Math.max(0, q.life / q.max);
    ctx.fillStyle = `hsl(${q.hue} 90% 72%)`;
    ctx.beginPath();
    ctx.arc(X(q.x), Y(q.y), q.r * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = `800 ${Math.round(18 * zoom + 6)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (const f of fx.floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,40,90,.7)';
    ctx.strokeText(f.text, X(f.x), Y(f.y));
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, X(f.x), Y(f.y));
  }
  ctx.globalAlpha = 1;

  // bruma gris fuera del círculo seguro
  const R = hazeRadius(m.t) * zoom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(X(0), Y(0), Math.max(1, R), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(112,122,136,.6)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(200,252,255,.95)';
  ctx.shadowColor = '#7fe8ff';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(X(0), Y(0), Math.max(1, R), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(0,30,90,0)');
  v.addColorStop(1, 'rgba(0,30,90,.3)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawCell(ctx: CanvasRenderingContext2D, a: BlobDraw, p: Match['players'][number], x: number, y: number, r: number, X: (v: number) => number, Y: (v: number) => number, mass: number) {
  const { zoom } = a;
  const px = X(x);
  const py = Y(y);
  const R = r * zoom;
  const mine = p.id === a.me;
  // aura de poderes
  if (p.magnet > 0 || p.dash > 0) {
    ctx.fillStyle = p.magnet > 0 ? 'rgba(192,80,255,.22)' : 'rgba(255,180,0,.26)';
    ctx.beginPath();
    ctx.arc(px, py, R + (p.magnet > 0 ? 420 * zoom : 16 * zoom), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = `hsl(${p.hue} 90% 55%)`;
  ctx.shadowBlur = mine ? 22 : 10;
  const body = ctx.createRadialGradient(px - R * 0.35, py - R * 0.4, R * 0.05, px, py, R);
  body.addColorStop(0, `hsl(${p.hue} 95% 88%)`);
  body.addColorStop(0.55, `hsl(${p.hue} 85% 62%)`);
  body.addColorStop(1, `hsl(${p.hue} 85% 42%)`);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // rostro dentro del cristal
  if (R > 14) {
    const img = a.art.head(p.id, a.specs[p.id] ?? null);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, R * 0.72, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(px - R, py - R, R * 2, R * 2);
      ctx.drawImage(img, px - R * 0.72, py - R * 0.72, R * 1.44, R * 1.44);
      ctx.restore();
    }
  }
  const gl = ctx.createLinearGradient(px, py - R, px, py + R * 0.1);
  gl.addColorStop(0, 'rgba(255,255,255,.65)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.ellipse(px - R * 0.12, py - R * 0.52, R * 0.66, R * 0.36, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = Math.max(2, R * 0.05);
  ctx.beginPath();
  ctx.arc(px, py, R, 0, Math.PI * 2);
  ctx.stroke();
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(90,200,255,.95)';
    ctx.lineWidth = Math.max(3, R * 0.07);
    ctx.setLineDash([R * 0.3, R * 0.18]);
    ctx.beginPath();
    ctx.arc(px, py, R + 7 * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (p.frozen > 0) {
    ctx.fillStyle = 'rgba(190,240,255,.5)';
    ctx.beginPath();
    ctx.arc(px, py, R, 0, Math.PI * 2);
    ctx.fill();
  }
  if (R > 20) {
    ctx.font = `800 ${Math.round(Math.max(11, R * 0.34))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,40,90,.75)';
    ctx.strokeText(p.name, px, py + R * 0.95 + 10);
    ctx.fillStyle = mine ? '#d8ff90' : '#fff';
    ctx.fillText(p.name, px, py + R * 0.95 + 10);
    if (R > 34) {
      ctx.font = `700 ${Math.round(R * 0.22)}px system-ui, sans-serif`;
      ctx.strokeText(String(Math.round(mass)), px, py + R * 0.95 + 10 + R * 0.28);
      ctx.fillText(String(Math.round(mass)), px, py + R * 0.95 + 10 + R * 0.28);
    }
  }
}

export function drawBlobMinimap(ctx: CanvasRenderingContext2D, size: number, m: Match, me: string) {
  ctx.clearRect(0, 0, size, size);
  const s = size / 2 / (ARENA + 40);
  const mid = size / 2;
  ctx.fillStyle = 'rgba(120,205,245,.85)';
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.arc(mid, mid, Math.max(1, hazeRadius(m.t) * s), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(110,120,132,.72)';
  ctx.fill('evenodd');
  ctx.restore();
  ctx.fillStyle = 'rgba(170,90,230,.9)';
  for (const j of m.jellies) {
    ctx.beginPath();
    ctx.arc(mid + j.x * s, mid + j.y * s, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of m.players) {
    if (!p.alive) continue;
    const mass = totalMass(p);
    const cx = p.cells.reduce((acc, c) => acc + c.x * c.mass, 0) / (mass || 1);
    const cy = p.cells.reduce((acc, c) => acc + c.y * c.mass, 0) / (mass || 1);
    ctx.fillStyle = p.id === me ? '#fff' : `hsl(${p.hue} 85% 55%)`;
    ctx.beginPath();
    ctx.arc(mid + cx * s, mid + cy * s, p.id === me ? 4.5 : Math.min(5, 2 + Math.sqrt(mass) / 14), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mid, mid, mid - 1, 0, Math.PI * 2);
  ctx.stroke();
}
