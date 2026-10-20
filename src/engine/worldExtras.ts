/** elementos que acompañan al mundo: órbitas, islotes flotantes, destellos y tráfico marino. todo dibujado por código. */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

const TAU = Math.PI * 2;

function star(g: Graphics, x: number, y: number, r: number, color = 0xffffff) {
  g.poly([x, y - r, x + r * 0.22, y - r * 0.22, x + r, y, x + r * 0.22, y + r * 0.22, x, y + r, x - r * 0.22, y + r * 0.22, x - r, y, x - r * 0.22, y - r * 0.22]).fill({ color });
}

function makeMoon(): Container {
  const c = new Container();
  const g = new Graphics();
  g.circle(0, 0, 40).fill({ color: 0xdfe9f6 }).stroke({ width: 3, color: 0x6a8fb8, alpha: 0.8 });
  g.circle(-9, -10, 30).fill({ color: 0xf4f9ff, alpha: 0.7 });
  for (const [x, y, r] of [[10, 8, 8], [-14, 12, 5], [16, -14, 4.5], [-4, -20, 3.5]] as const) g.circle(x, y, r).fill({ color: 0xb4c6dc, alpha: 0.75 });
  g.ellipse(-14, -16, 12, 6).fill({ color: 0xffffff, alpha: 0.6 });
  c.addChild(g);
  return c;
}

function makeSatellite(): Container {
  const c = new Container();
  const g = new Graphics();
  for (const side of [-1, 1]) {
    g.roundRect(side * 22 - 15, -8, 30, 16, 2).fill({ color: 0x2a78c8 }).stroke({ width: 2, color: 0xe6f6ff });
    g.moveTo(side * 22 - 5, -8).lineTo(side * 22 - 5, 8).moveTo(side * 22 + 5, -8).lineTo(side * 22 + 5, 8).stroke({ width: 1, color: 0xbfe6ff, alpha: 0.8 });
  }
  g.roundRect(-11, -11, 22, 22, 6).fill({ color: 0xeaf8ff }).stroke({ width: 2.5, color: 0x4a8ab8 });
  g.circle(0, 0, 5).fill({ color: 0x8fe0ff }).stroke({ width: 1.5, color: 0xffffff });
  c.addChild(g);
  return c;
}

function makeIslet(): Container {
  const c = new Container();
  const g = new Graphics();
  g.poly([-46, 4, 46, 4, 30, 34, 10, 58, -8, 52, -30, 30]).fill({ color: 0x9a7048 }).stroke({ width: 2.5, color: 0x5a3c1c, alpha: 0.8 });
  g.ellipse(0, 4, 48, 14).fill({ color: 0x7ccb48 }).stroke({ width: 2.5, color: 0x2f7a24 });
  g.ellipse(-12, 1, 22, 6).fill({ color: 0xc8f08a, alpha: 0.8 });
  g.roundRect(-3, -30, 6, 34, 3).fill({ color: 0x7a5026 });
  g.circle(-2, -38, 17).fill({ color: 0x4aa83a }).stroke({ width: 2, color: 0x2a6a20 });
  g.circle(-8, -44, 7).fill({ color: 0xa6e46a, alpha: 0.8 });
  g.circle(24, -4, 3.4).fill({ color: 0xff7aa8 }).circle(-26, -2, 3).fill({ color: 0xffffff });
  c.addChild(g);
  return c;
}

/** capas que rodean al planeta en la vista exterior. */
export class OrbitalAccents {
  readonly root = new Container();
  private moon = makeMoon();
  private sat = makeSatellite();
  private ring: Graphics[] = [];
  private islets: Array<{ c: Container; x: number; y: number; phase: number }> = [];
  private sparkles = new Graphics();
  private seeds: Array<[number, number, number, number]> = [];

  constructor() {
    this.root.sortableChildren = true;
    this.root.addChild(this.moon, this.sat);
    for (let i = 0; i < 16; i++) {
      const b = new Graphics();
      b.circle(0, 0, 11).fill({ color: 0xd8f6ff, alpha: 0.55 }).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
      b.circle(-3.5, -3.5, 3.2).fill({ color: 0xffffff, alpha: 0.95 });
      this.ring.push(b);
      this.root.addChild(b);
    }
    for (const [x, y] of [[-1.5, -0.62], [1.55, 0.5], [-1.25, 0.82]] as const) {
      const c = makeIslet();
      this.islets.push({ c, x, y, phase: x * 3 });
      this.root.addChild(c);
    }
    this.root.addChild(this.sparkles);
    this.sparkles.zIndex = 4;
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 18; i++) this.seeds.push([(rnd() - 0.5) * 3.4, (rnd() - 0.5) * 2.2, rnd() * TAU, 5 + rnd() * 7]);
  }

  /** r: radio del planeta en pantalla; halfW/halfH: mitad de la pantalla, para mantener los islotes a la vista. */
  update(time: number, r: number, halfW: number, halfH: number) {
    const a = time * 0.13;
    this.moon.scale.set((r * 0.12) / 40);
    this.moon.position.set(Math.cos(a) * r * 1.3, Math.sin(a) * r * 0.32 - r * 0.42);
    this.moon.zIndex = Math.sin(a) > 0 ? 6 : -2;
    const b = time * 0.31 + 2;
    this.sat.scale.set((r * 0.2) / 56);
    const sx = Math.cos(b) * r * 1.02;
    const sy = Math.sin(b) * r * 0.5;
    const tilt = -0.5;
    this.sat.position.set(sx * Math.cos(tilt) - sy * Math.sin(tilt), sx * Math.sin(tilt) + sy * Math.cos(tilt));
    this.sat.rotation = Math.sin(b) * 0.18;
    this.sat.zIndex = Math.sin(b) > 0 ? 6 : -2;
    this.ring.forEach((g, i) => {
      const t = (i / this.ring.length) * TAU + time * 0.08;
      const rx = r * 1.16;
      const ry = r * 0.26;
      const x = Math.cos(t) * rx;
      const y = Math.sin(t) * ry;
      const rot = -0.22;
      g.position.set(x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot));
      g.scale.set(((r * 0.07) / 11) * (0.85 + Math.sin(t) * 0.15));
      g.zIndex = Math.sin(t) > 0 ? 5 : -3;
    });
    const limX = halfW - 70;
    const limY = halfH - 90;
    for (const it of this.islets) {
      const x = Math.max(-limX, Math.min(limX, it.x * r));
      const y = Math.max(-limY, Math.min(limY, it.y * r)) + Math.sin(time * 0.8 + it.phase) * 8;
      it.c.position.set(x, y);
      it.c.scale.set(Math.max(0.55, Math.min(1, r / 360)));
      it.c.zIndex = 3;
    }
    this.sparkles.clear();
    for (const [sx0, sy0, ph, size] of this.seeds) {
      const tw = 0.5 + Math.sin(time * 1.6 + ph) * 0.5;
      star(this.sparkles, sx0 * r, sy0 * r, size * tw + 1);
    }
    this.sparkles.alpha = 0.8;
  }
}

interface Boat {
  sprite: Sprite;
  kind: 'velero' | 'delfin';
  r: number;
  speed: number;
  a: number;
  size: number;
}

/** veleros y delfines que recorren el mar interior. */
export class SeaTraffic {
  readonly root = new Container();
  private items: Boat[] = [];

  constructor(tex: { velero: Texture; delfin: Texture }) {
    const specs: Array<[Boat['kind'], number, number, number, number]> = [
      ['velero', 560, 0.045, 0.4, 82], ['velero', 700, -0.032, 3.1, 66], ['delfin', 640, 0.11, 1.7, 62], ['delfin', 470, -0.09, 4.4, 50],
    ];
    for (const [kind, r, speed, a, size] of specs) {
      const sprite = new Sprite(tex[kind]);
      sprite.anchor.set(0.5, kind === 'velero' ? 0.85 : 0.6);
      this.items.push({ sprite, kind, r, speed, a, size });
      this.root.addChild(sprite);
    }
  }

  update(time: number) {
    for (const it of this.items) {
      const ang = it.a + time * it.speed;
      const x = Math.cos(ang) * it.r;
      const y = Math.sin(ang) * it.r * 0.78;
      const k = it.size / it.sprite.texture.width;
      const dir = it.speed > 0 ? -1 : 1;
      const hop = it.kind === 'delfin' ? -Math.abs(Math.sin(time * 1.3 + it.a)) * 18 : Math.sin(time * 1.1 + it.a) * 4;
      it.sprite.position.set(x, y + hop);
      it.sprite.scale.set(dir * Math.sign(Math.cos(ang) * -it.speed || 1) * k, k);
      it.sprite.rotation = it.kind === 'delfin' ? Math.cos(time * 1.3 + it.a) * 0.35 * dir : Math.sin(time * 1.1 + it.a) * 0.05;
      it.sprite.zIndex = y;
    }
  }
}
