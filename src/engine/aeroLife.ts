import { Container, Sprite, Texture, TilingSprite } from 'pixi.js';
import { causticsTile, glassBubble, reedCanvas, sparkleCanvas, svgCanvas } from '../art/aero';

const UI = `${import.meta.env.BASE_URL}assets/ui/`;
const DECO = `${import.meta.env.BASE_URL}assets/decorations/`;

export interface LifeAssets {
  caustics: Texture;
  bubble: Texture;
  droplet: Texture;
  reedA: Texture;
  reedB: Texture;
  sparkle: Texture;
  fish: Texture[];
  gold: Texture;
}

export async function loadLifeAssets(): Promise<LifeAssets> {
  const [pez, payaso, azul] = await Promise.all([svgCanvas(`${DECO}pez.svg`, 256), svgCanvas(`${UI}pez-payaso.svg`, 256), svgCanvas(`${UI}pez-azul.svg`, 256)]);
  const caustics = Texture.from(causticsTile(256));
  caustics.source.style.addressMode = 'repeat';
  return {
    caustics,
    bubble: Texture.from(glassBubble(256, { seed: 3 })),
    droplet: Texture.from(glassBubble(64, { seed: 8 })),
    reedA: Texture.from(reedCanvas(280, 260, 5)),
    reedB: Texture.from(reedCanvas(220, 200, 9)),
    sparkle: Texture.from(sparkleCanvas(64)),
    fish: [Texture.from(pez), Texture.from(payaso), Texture.from(azul)],
    gold: Texture.from(pez),
  };
}

interface Swimmer {
  sprite: Sprite;
  x: number;
  y: number;
  speed: number;
  dir: -1 | 1;
  phase: number;
  size: number;
}

interface BigBubble {
  sprite: Sprite;
  fx: number;
  fy: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

interface Droplet {
  sprite: Sprite;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface Jumper {
  sprite: Sprite;
  t: number;
  dur: number;
  x0: number;
  x1: number;
  y0: number;
  peak: number;
  caught: boolean;
}

/** vida ambiental frutiger aero: cáusticas, peces, burbujas de cristal, juncos y destellos. */
export class AeroLife {
  /** capa de pantalla bajo la isla */
  readonly bg = new Container();
  /** capa de escena bajo el suelo (peces nadando) */
  readonly water = new Container();
  /** capa de escena sobre los objetos (pez saltarín y salpicaduras) */
  readonly front = new Container();
  /** capa de pantalla sobre todo */
  readonly fg = new Container();

  private caustics: TilingSprite;
  private swimmers: Swimmer[] = [];
  private bubbles: BigBubble[] = [];
  private reeds: Array<{ sprite: Sprite; phase: number; side: -1 | 1; tex: Texture }> = [];
  private sparkles: Array<{ sprite: Sprite; t: number; period: number }> = [];
  private droplets: Droplet[] = [];
  private jumper: Jumper | null = null;
  private jumpTimer = 6;
  private w = 0;
  private h = 0;
  private time = 0;

  constructor(private a: LifeAssets) {
    this.caustics = new TilingSprite({ texture: a.caustics, width: 10, height: 10 });
    this.caustics.blendMode = 'add';
    this.caustics.alpha = 0.3;
    this.bg.addChild(this.caustics);

    const lanes = [-70, 30, 150, 230, 290];
    lanes.forEach((y, i) => {
      const sprite = new Sprite(a.fish[i % a.fish.length]);
      sprite.anchor.set(0.5);
      const size = 44 + (i % 3) * 14 + y * 0.05;
      sprite.scale.set(size / a.fish[0].width);
      const sw: Swimmer = { sprite, x: -500 + i * 240, y, speed: 22 + (i % 3) * 9, dir: i % 2 ? 1 : -1, phase: i * 1.7, size };
      this.water.addChild(sprite);
      this.swimmers.push(sw);
      this.place(sw);
    });

    [0.16, 0.08].forEach((frac, i) => {
      const sprite = new Sprite(a.bubble);
      sprite.anchor.set(0.5);
      sprite.alpha = 0.92;
      this.bg.addChild(sprite);
      this.bubbles.push({ sprite, fx: i ? 0.2 : 0.66, fy: i ? 0.3 : 0.24, vx: i ? 4 : -3, vy: -5 - i * 3, size: frac, phase: i * 2 });
    });
    const front = new Sprite(a.bubble);
    front.anchor.set(0.5);
    front.alpha = 0.9;
    this.fg.addChild(front);
    this.bubbles.push({ sprite: front, fx: 0.9, fy: 0.62, vx: -6, vy: -8, size: 0.2, phase: 4 });

    [a.reedA, a.reedB].forEach((tex, i) => {
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5, 1);
      this.fg.addChild(sprite);
      this.reeds.push({ sprite, phase: i * 2.4, side: i ? 1 : -1, tex });
    });

    for (let i = 0; i < 14; i++) {
      const sprite = new Sprite(a.sparkle);
      sprite.anchor.set(0.5);
      sprite.alpha = 0;
      this.fg.addChild(sprite);
      this.sparkles.push({ sprite, t: Math.random() * 3, period: 1.4 + Math.random() * 1.8 });
    }
  }

  /* ---------- diseño ---------- */

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    const horizon = h * 0.4;
    this.caustics.position.set(0, horizon);
    this.caustics.width = w;
    this.caustics.height = h - horizon;
    this.caustics.tileScale.set(1.1, 0.55);
    const m = Math.min(w, h);
    for (const b of this.bubbles) {
      const s = m * b.size;
      b.sprite.scale.set(s / this.a.bubble.width);
      if (b.sprite.x === 0 && b.sprite.y === 0) b.sprite.position.set(w * b.fx, h * b.fy);
    }
    for (const r of this.reeds) {
      const hh = h * (r.tex === this.a.reedA ? 0.3 : 0.22);
      const k = hh / r.tex.height;
      r.sprite.scale.set(r.side * k, k);
      r.sprite.position.set(r.side < 0 ? w * 0.04 : w * 0.97, h + 4);
    }
    for (const sp of this.sparkles) this.relocate(sp);
  }

  private relocate(sp: { sprite: Sprite; t: number; period: number }) {
    const horizon = this.h * 0.4;
    sp.sprite.position.set(Math.random() * this.w, horizon + 14 + Math.random() * (this.h - horizon - 40));
    sp.sprite.scale.set((0.18 + Math.random() * 0.3) * (this.h / 900 + 0.4));
  }

  private place(s: Swimmer) {
    s.sprite.position.set(s.x, s.y);
    const k = s.size / this.a.fish[0].width;
    s.sprite.scale.set(s.dir > 0 ? -k : k, k);
  }

  /* ---------- animación ---------- */

  update(dt: number, reduced: boolean) {
    this.time += dt;
    if (reduced) {
      for (const sp of this.sparkles) sp.sprite.alpha = 0.5;
      return;
    }
    const t = this.time;
    this.caustics.tilePosition.x += 7 * dt;
    this.caustics.tilePosition.y += 3.5 * dt;
    this.caustics.alpha = 0.28 + Math.sin(t * 0.7) * 0.06;

    for (const b of this.bubbles) {
      b.sprite.x += (b.vx + Math.sin(t * 0.6 + b.phase) * 3) * dt;
      b.sprite.y += b.vy * dt;
      const r = b.sprite.width / 2;
      if (b.sprite.y < -r) {
        b.sprite.y = this.h + r;
        b.sprite.x = Math.random() * this.w;
      }
      if (b.sprite.x < -r) b.sprite.x = this.w + r;
      if (b.sprite.x > this.w + r) b.sprite.x = -r;
    }
    for (const r of this.reeds) r.sprite.rotation = Math.sin(t * 0.9 + r.phase) * 0.025 * -r.side + Math.sin(t * 2.3 + r.phase) * 0.006;
    for (const sp of this.sparkles) {
      sp.t += dt;
      if (sp.t >= sp.period) {
        sp.t = 0;
        this.relocate(sp);
      }
      sp.sprite.alpha = Math.pow(Math.sin((Math.PI * sp.t) / sp.period), 3);
    }

    for (const s of this.swimmers) {
      s.x += s.dir * s.speed * dt;
      if (s.x > 620) s.dir = -1;
      if (s.x < -620) s.dir = 1;
      s.sprite.position.set(s.x, s.y + Math.sin(t * 1.4 + s.phase) * 5);
      const k = s.size / this.a.fish[0].width;
      s.sprite.scale.set(s.dir > 0 ? -k : k, k);
      s.sprite.skew.y = Math.sin(t * 7 + s.phase) * 0.06;
    }

    this.jumpTimer -= dt;
    if (!this.jumper && this.jumpTimer <= 0) this.startJump();
    if (this.jumper) this.stepJump(dt);

    for (let i = this.droplets.length - 1; i >= 0; i--) {
      const d = this.droplets[i];
      d.age += dt;
      d.vy += 520 * dt;
      d.sprite.x += d.vx * dt;
      d.sprite.y += d.vy * dt;
      d.sprite.alpha = Math.max(0, 1 - d.age / d.life);
      if (d.age >= d.life) {
        d.sprite.destroy();
        this.droplets.splice(i, 1);
      }
    }
  }

  private startJump() {
    const x0 = (Math.random() * 2 - 1) * 260;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sprite = new Sprite(this.a.gold);
    sprite.anchor.set(0.5);
    sprite.scale.set(78 / this.a.gold.width);
    this.front.addChild(sprite);
    this.jumper = { sprite, t: 0, dur: 1.7, x0, x1: x0 + dir * (150 + Math.random() * 90), y0: 205 + Math.random() * 40, peak: 150 + Math.random() * 40, caught: false };
    this.splash(x0, this.jumper.y0, 9);
  }

  private stepJump(dt: number) {
    const j = this.jumper!;
    j.t += dt;
    const u = Math.min(1, j.t / j.dur);
    const x = j.x0 + (j.x1 - j.x0) * u;
    const y = j.y0 - 4 * j.peak * u * (1 - u);
    const dx = j.x1 - j.x0;
    const dy = -4 * j.peak * (1 - 2 * u);
    j.sprite.position.set(x, y);
    const k = 78 / this.a.gold.width;
    if (dx > 0) {
      j.sprite.scale.set(-k, k);
      j.sprite.rotation = Math.atan2(dy, dx);
    } else {
      j.sprite.scale.set(k, k);
      j.sprite.rotation = Math.atan2(dy, dx) - Math.PI;
    }
    if (u >= 1) {
      this.splash(x, j.y0, 12);
      j.sprite.destroy();
      this.jumper = null;
      this.jumpTimer = 9 + Math.random() * 9;
    }
  }

  private splash(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const sprite = new Sprite(this.a.droplet);
      sprite.anchor.set(0.5);
      const s = 7 + Math.random() * 9;
      sprite.scale.set(s / this.a.droplet.width);
      sprite.position.set(x, y);
      this.front.addChild(sprite);
      this.droplets.push({ sprite, vx: (Math.random() - 0.5) * 170, vy: -90 - Math.random() * 170, age: 0, life: 0.7 + Math.random() * 0.4 });
    }
  }

  /** salpicadura al reventar una burbuja o atrapar un pez. */
  burst(x: number, y: number) {
    this.splash(x, y, 7);
  }

  /** posición en escena del pez saltarín si se puede atrapar. */
  jumperPosition(): { x: number; y: number; radius: number } | null {
    const j = this.jumper;
    if (!j || j.caught) return null;
    return { x: j.sprite.x, y: j.sprite.y, radius: 46 };
  }

  catchJumper() {
    const j = this.jumper;
    if (!j) return;
    j.caught = true;
    this.splash(j.sprite.x, j.sprite.y, 12);
    j.sprite.destroy();
    this.jumper = null;
    this.jumpTimer = 10 + Math.random() * 8;
  }
}
