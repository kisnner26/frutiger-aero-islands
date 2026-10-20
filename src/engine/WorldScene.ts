import { Application, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { CATALOG_MAP } from '../catalog/catalog';
import { renderBasin, renderGlassFrame, renderHalo, renderPlanet, renderWorldSky } from '../art/planet';
import { pencilSprite } from '../art/pencil';
import { GROUND_HALF, renderGround } from '../art/scenery';
import { loadLifeAssets, type LifeAssets } from './aeroLife';
import { WavingFlag } from './flag';
import { K, TILT, project } from './projection';
import { BASIN_RADIUS, DEFAULT_WORLD_CAMERA, clampWorldCamera, screenToWorld, worldFit, zoomWorldAt, type WorldCamera } from '../world/worldCamera';
import type { WorldIsland } from '../world/archipelago';
import type { WorldView } from '../world/worldState';

export interface WorldCallbacks {
  onSelect(id: string | null): void;
  onView(view: WorldView): void;
  onMode(mode: 'lejos' | 'dentro'): void;
}

const MINI = 0.3;
const TRANSITION_SECONDS = 1.35;

const smooth = (a: number, b: number, t: number) => {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface IslandNode {
  data: WorldIsland;
  box: Container;
  ring: Graphics;
  flag: WavingFlag | null;
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

interface Bubble {
  sprite: Sprite;
  x: number;
  y: number;
  vy: number;
  phase: number;
}

/** vista 2.5d del mundo: planeta lejano, transición hacia su océano interior y archipiélago. */
export class WorldScene {
  private app!: Application;
  private sky = new Sprite();
  private far = new Container();
  private halo = new Sprite();
  private planet = new Sprite();
  private interior = new Container();
  private inner = new Container();
  private mask = new Graphics();
  private basin = new Sprite();
  private caustics!: TilingSprite;
  private under = new Container();
  private routes = new Graphics();
  private islandLayer = new Container();
  private overlay = new Container();
  private frame = new Sprite();
  private nodes = new Map<string, IslandNode>();
  private swimmers: Swimmer[] = [];
  private bubbles: Bubble[] = [];
  private assets!: LifeAssets;
  private groundTex!: Texture;
  private objTex = new Map<string, Texture>();

  private cam: WorldCamera = { ...DEFAULT_WORLD_CAMERA };
  private camTween: { from: WorldCamera; to: WorldCamera; t: number } | null = null;
  private target: 0 | 1 = 0;
  private t = 0;
  private selectedId: string | null = null;
  private time = 0;
  private reduced: boolean;
  private lastSize = { w: 0, h: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; cam: WorldCamera; moved: boolean } | null = null;
  private pinch: { dist: number; zoom: number; mid: { x: number; y: number }; cam: WorldCamera } | null = null;
  private viewTimer = 0;
  private resizeTimer = 0;
  private observer?: ResizeObserver;
  private destroyed = false;
  private listeners: Array<() => void> = [];
  private interval?: number;

  private constructor(private cb: WorldCallbacks, reduced: boolean) {
    this.reduced = reduced;
  }

  static async create(host: HTMLElement, cb: WorldCallbacks, reduced: boolean, islands: WorldIsland[], initial: WorldView | null): Promise<WorldScene> {
    const s = new WorldScene(cb, reduced);
    await s.init(host, islands, initial);
    return s;
  }

  private async init(host: HTMLElement, islands: WorldIsland[], initial: WorldView | null) {
    const app = new Application();
    await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    try {
      const ids = [...new Set(islands.flatMap((i) => i.objects.map((o) => o.assetId)))];
      const [assets, ...tex] = await Promise.all([loadLifeAssets(), ...ids.map(async (id) => Texture.from(await pencilSprite(CATALOG_MAP.get(id)!.assetPath)))]);
      this.assets = assets;
      ids.forEach((id, i) => this.objTex.set(id, tex[i]));
      this.groundTex = Texture.from(renderGround());
      this.planet.texture = Texture.from(renderPlanet(720));
      this.halo.texture = Texture.from(renderHalo(512));
      this.basin.texture = Texture.from(renderBasin(1600));
    } catch {
      app.destroy(true, { children: true });
      throw new Error('no se pudo cargar el mundo');
    }
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }

    host.appendChild(app.canvas);
    app.canvas.style.touchAction = 'none';
    app.canvas.style.display = 'block';

    this.planet.anchor.set(0.5);
    this.halo.anchor.set(0.5);
    this.far.addChild(this.halo, this.planet);

    this.basin.anchor.set(0.5);
    const basinR = this.basin.texture.width / 2 - 6;
    this.basin.scale.set(BASIN_RADIUS / basinR);
    this.caustics = new TilingSprite({ texture: this.assets.caustics, width: BASIN_RADIUS * 2, height: BASIN_RADIUS * 2 });
    this.caustics.anchor.set(0.5);
    this.caustics.blendMode = 'add';
    this.caustics.alpha = 0.13;
    this.caustics.tileScale.set(1.8);
    this.islandLayer.sortableChildren = true;
    this.inner.addChild(this.basin, this.caustics, this.under, this.routes, this.islandLayer, this.overlay);
    this.frame.anchor.set(0.5);
    this.interior.addChild(this.inner, this.frame);
    this.interior.mask = this.mask;
    app.stage.addChild(this.sky, this.far, this.interior, this.mask);
    this.sky.anchor.set(0);

    this.buildIslands(islands);
    this.buildRoutes();
    this.buildLife();

    if (initial) {
      this.cam = clampWorldCamera(initial);
      this.selectedId = initial.selectedId;
      this.target = initial.mode === 'dentro' ? 1 : 0;
      this.t = this.target;
    }
    this.layout();
    this.bind(app.canvas);
    this.observer = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.layout(true);
        this.renderNow();
      }, 120);
      this.renderNow();
    });
    this.observer.observe(host);
    this.listen(document, 'visibilitychange', () => this.syncRunning());
    app.ticker.add((tk) => this.update(tk.deltaMS / 1000));
    this.syncRunning();
    this.updateRings();
    this.renderNow();
  }

  /* ---------- construcción ---------- */

  private buildIslands(islands: WorldIsland[]) {
    for (const data of islands) {
      const box = new Container();
      box.position.set(data.x, data.y);
      box.zIndex = data.y;
      const ground = new Sprite(this.groundTex);
      ground.anchor.set(0.5);
      ground.scale.set((GROUND_HALF.w * 2 * MINI) / this.groundTex.width);
      box.addChild(ground);
      const items = new Container();
      items.sortableChildren = true;
      for (const o of data.objects) {
        const item = CATALOG_MAP.get(o.assetId);
        const tex = this.objTex.get(o.assetId);
        if (!item || !tex) continue;
        const sp = new Sprite(tex);
        sp.anchor.set(0.5, item.anchorY);
        const k = (item.spriteSize * o.scale * MINI) / tex.width;
        sp.scale.set(o.rotation % 2 ? -k : k, k);
        const p = project(o.x, o.y);
        sp.position.set(p.x * MINI, p.y * MINI);
        sp.zIndex = p.y;
        items.addChild(sp);
      }
      box.addChild(items);
      let flag: WavingFlag | null = null;
      if (data.country) {
        flag = new WavingFlag(data.country, { pole: 62, cloth: 44 });
        flag.position.set(-92, -30);
        box.addChild(flag);
      } else if (data.kind === 'mia') {
        const pennant = new Graphics();
        pennant.moveTo(-70, -78).lineTo(-70, -128).stroke({ width: 3, color: 0x6b4220 });
        pennant.moveTo(-70, -128).lineTo(-42, -118).lineTo(-70, -106).closePath().fill({ color: 0xff5a4a }).stroke({ width: 1.5, color: 0xffffff });
        box.addChild(pennant);
      }
      const ring = new Graphics();
      ring.visible = false;
      box.addChildAt(ring, 1);
      this.islandLayer.addChild(box);
      this.nodes.set(data.id, { data, box, ring, flag });
    }
  }

  /** rutas marítimas: unen islas reales con la del jugador y desaparecen si aún está solo. */
  private buildRoutes() {
    const mine = this.nodes.get('mia');
    if (!mine) return;
    const destinations = [...this.nodes.values()]
      .filter((node) => node.data.id !== 'mia')
      .sort((a, b) => Math.hypot(a.data.x - mine.data.x, a.data.y - mine.data.y) - Math.hypot(b.data.x - mine.data.x, b.data.y - mine.data.y))
      .slice(0, 4);
    for (const destination of destinations) {
      const dx = destination.data.x - mine.data.x;
      const dy = destination.data.y - mine.data.y;
      const distance = Math.hypot(dx, dy);
      const pieces = Math.max(3, Math.floor(distance / 72));
      for (let part = 0; part < pieces; part += 2) {
        const from = part / pieces;
        const to = Math.min(1, (part + 1) / pieces);
        this.routes
          .moveTo(mine.data.x + dx * from, mine.data.y + dy * from)
          .lineTo(mine.data.x + dx * to, mine.data.y + dy * to)
          .stroke({ width: 5, color: 0xd8fbff, alpha: 0.62 });
      }
      this.routes.circle(destination.data.x, destination.data.y, 13).stroke({ width: 3, color: 0xaaf5ff, alpha: 0.8 });
    }
  }

  private buildLife() {
    const lanes = [-300, -60, 180, 430];
    lanes.forEach((y, i) => {
      const sprite = new Sprite(this.assets.fish[i % this.assets.fish.length]);
      sprite.anchor.set(0.5);
      const sw: Swimmer = { sprite, x: -600 + i * 330, y, speed: 24 + i * 7, dir: i % 2 ? 1 : -1, phase: i * 1.9, size: 70 };
      sprite.scale.set(sw.size / this.assets.fish[0].width);
      sprite.alpha = 0.9;
      this.under.addChild(sprite);
      this.swimmers.push(sw);
    });
    [0, 1, 2].forEach((i) => {
      const sprite = new Sprite(this.assets.bubble);
      sprite.anchor.set(0.5);
      const size = 70 + i * 22;
      sprite.scale.set(size / this.assets.bubble.width);
      sprite.alpha = 0.85;
      const b: Bubble = { sprite, x: -420 + i * 380, y: 200 + i * 120, vy: -9 - i * 3, phase: i * 2 };
      sprite.position.set(b.x, b.y);
      this.overlay.addChild(sprite);
      this.bubbles.push(b);
    });
  }

  private layout(force = false) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    if (!force && w === this.lastSize.w && h === this.lastSize.h) return;
    this.lastSize = { w, h };
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.sky.texture = Texture.from(renderWorldSky(w, h, dpr));
    this.sky.width = w;
    this.sky.height = h;
    this.frame.texture = Texture.from(renderGlassFrame(w, h, dpr));
    this.frame.width = w;
    this.frame.height = h;
    const planetPx = Math.min(w, h) * 0.8;
    this.planet.scale.set(planetPx / this.planet.texture.width);
    this.halo.scale.set((planetPx * 1.55) / this.halo.texture.width);
    this.halo.alpha = 0.8;
  }

  /* ---------- ciclo de vida ---------- */

  private listen(target: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn as EventListener, opts);
    this.listeners.push(() => target.removeEventListener(type, fn as EventListener, opts));
  }

  private syncRunning() {
    if (this.destroyed || !this.app) return;
    window.clearInterval(this.interval);
    this.interval = undefined;
    if (this.reduced) {
      this.app.ticker.stop();
    } else if (document.hidden) {
      this.app.ticker.stop();
    } else {
      this.app.ticker.start();
    }
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    if (reduced) {
      this.t = this.target;
      this.camTween = null;
    }
    this.syncRunning();
    this.renderNow();
  }

  destroy() {
    this.destroyed = true;
    window.clearTimeout(this.viewTimer);
    window.clearTimeout(this.resizeTimer);
    this.observer?.disconnect();
    this.listeners.forEach((off) => off());
    this.listeners = [];
    if (this.app) {
      this.app.ticker.stop();
      this.app.destroy(true, { children: true });
    }
  }

  /* ---------- api ---------- */

  get mode(): 'lejos' | 'dentro' {
    return this.target ? 'dentro' : 'lejos';
  }

  enter() {
    if (this.target === 1) return;
    this.target = 1;
    if (this.reduced) this.t = 1;
    this.cb.onMode('dentro');
    this.emitView();
    this.renderNow();
  }

  leave() {
    if (this.target === 0) return;
    this.target = 0;
    this.selectedId = null;
    this.cb.onSelect(null);
    if (this.reduced) this.t = 0;
    this.cb.onMode('lejos');
    this.emitView();
    this.renderNow();
  }

  select(id: string | null) {
    this.selectedId = id;
    this.updateRings();
    this.emitView();
    this.renderNow();
  }

  focus(id: string, zoom = 1.5) {
    const n = this.nodes.get(id);
    if (!n) return;
    this.moveCamera({ cx: n.data.x, cy: n.data.y, zoom });
  }

  zoomBy(factor: number) {
    const vp = this.vp();
    this.cam = zoomWorldAt(this.cam, vp, { x: vp.width / 2, y: vp.height / 2 }, this.cam.zoom * factor);
    this.emitView();
    this.renderNow();
  }

  pan(dx: number, dy: number) {
    const s = worldFit(this.vp()) * this.cam.zoom;
    this.cam = clampWorldCamera({ ...this.cam, cx: this.cam.cx + dx / s, cy: this.cam.cy + dy / s });
    this.emitView();
    this.renderNow();
  }

  resetCamera() {
    this.moveCamera({ ...DEFAULT_WORLD_CAMERA });
  }

  private moveCamera(to: WorldCamera) {
    const target = clampWorldCamera(to);
    if (this.reduced) {
      this.cam = target;
      this.camTween = null;
      this.emitView();
      this.renderNow();
    } else {
      this.camTween = { from: { ...this.cam }, to: target, t: 0 };
    }
  }

  private vp() {
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  private emitView() {
    window.clearTimeout(this.viewTimer);
    this.viewTimer = window.setTimeout(() => this.cb.onView({ mode: this.mode, ...this.cam, selectedId: this.selectedId }), 120);
  }

  /* ---------- dibujo ---------- */

  private updateRings() {
    for (const n of this.nodes.values()) {
      const sel = n.data.id === this.selectedId;
      n.ring.visible = sel;
      n.ring.clear();
      if (sel) {
        n.ring.ellipse(0, 6, 392 * K * MINI * 1.12, 312 * K * TILT * MINI * 1.2).stroke({ width: 4, color: 0xffffff, alpha: 0.95 });
        n.ring.ellipse(0, 6, 392 * K * MINI * 1.2, 312 * K * TILT * MINI * 1.3).stroke({ width: 3, color: 0xb8ff6a, alpha: 0.9 });
      }
    }
  }

  renderNow() {
    if (this.destroyed || !this.app) return;
    this.layout();
    this.apply();
    this.app.render();
  }

  private apply() {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const t = this.t;
    const e = ease(t);
    const cx = w / 2;
    const cy = h / 2;
    const planetR = (Math.min(w, h) * 0.8 * (this.planet.texture.width - 16)) / this.planet.texture.width / 2;

    this.far.position.set(cx, cy + (this.reduced ? 0 : Math.sin(this.time * 0.6) * 3));
    this.far.scale.set(1 + 5.2 * e);
    const farAlpha = 1 - smooth(0.5, 0.85, t);
    this.far.alpha = farAlpha;
    this.far.visible = t < 0.99;

    const finalR = Math.hypot(w, h) * 0.52;
    const maskR = lerp(planetR * 0.92, finalR, smooth(0, 1, t));
    this.mask.clear().circle(cx, cy, maskR).fill({ color: 0xffffff });
    this.interior.visible = t > 0.28;
    this.interior.alpha = smooth(0.28, 0.5, t);
    this.frame.position.set(cx, cy);
    this.frame.alpha = smooth(0.6, 1, t);

    const s = worldFit(this.vp()) * this.cam.zoom * lerp(0.4, 1, e);
    this.inner.scale.set(s);
    this.inner.position.set(cx - this.cam.cx * s, cy - this.cam.cy * s);
  }

  private update(dt: number) {
    this.time += dt;
    if (this.t !== this.target) {
      const step = dt / TRANSITION_SECONDS;
      this.t = this.target > this.t ? Math.min(1, this.t + step) : Math.max(0, this.t - step);
    }
    if (this.camTween) {
      const tw = this.camTween;
      tw.t = Math.min(1, tw.t + dt / 0.55);
      const k = ease(tw.t);
      this.cam = { cx: lerp(tw.from.cx, tw.to.cx, k), cy: lerp(tw.from.cy, tw.to.cy, k), zoom: lerp(tw.from.zoom, tw.to.zoom, k) };
      if (tw.t >= 1) {
        this.camTween = null;
        this.emitView();
      }
    }
    if (this.t > 0.2) {
      for (const n of this.nodes.values()) n.flag?.update(this.time);
      this.caustics.tilePosition.x += 6 * dt;
      this.caustics.tilePosition.y += 3 * dt;
      for (const sw of this.swimmers) {
        sw.x += sw.dir * sw.speed * dt;
        if (sw.x > 800) sw.dir = -1;
        if (sw.x < -800) sw.dir = 1;
        sw.sprite.position.set(sw.x, sw.y + Math.sin(this.time * 1.3 + sw.phase) * 5);
        const k = sw.size / this.assets.fish[0].width;
        sw.sprite.scale.set(sw.dir > 0 ? -k : k, k);
        sw.sprite.skew.y = Math.sin(this.time * 7 + sw.phase) * 0.06;
      }
      for (const b of this.bubbles) {
        b.y += b.vy * dt;
        if (b.y < -BASIN_RADIUS * 0.8) b.y = BASIN_RADIUS * 0.8;
        b.sprite.position.set(b.x + Math.sin(this.time * 0.7 + b.phase) * 14, b.y);
      }
      const sel = this.selectedId ? this.nodes.get(this.selectedId) : undefined;
      if (sel) sel.ring.alpha = 0.75 + Math.sin(this.time * 3) * 0.25;
    }
    this.apply();
  }

  /* ---------- entrada ---------- */

  private local(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private bind(canvas: HTMLCanvasElement) {
    this.listen(canvas, 'pointerdown', (e: PointerEvent) => this.onDown(e));
    this.listen(canvas, 'pointermove', (e: PointerEvent) => this.onMove(e));
    this.listen(canvas, 'pointerup', (e: PointerEvent) => this.onUp(e));
    this.listen(canvas, 'pointercancel', (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      this.drag = null;
      this.pinch = null;
    });
    this.listen(
      canvas,
      'wheel',
      (e: WheelEvent) => {
        if (this.t < 0.95) return;
        e.preventDefault();
        this.cam = zoomWorldAt(this.cam, this.vp(), this.local(e), this.cam.zoom * Math.exp(-e.deltaY * 0.0015));
        this.emitView();
        this.renderNow();
      },
      { passive: false },
    );
  }

  private planetHit(p: { x: number; y: number }) {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const r = (Math.min(w, h) * 0.8) / 2;
    return Math.hypot(p.x - w / 2, p.y - h / 2) <= r;
  }

  private islandAt(p: { x: number; y: number }): string | null {
    const wp = screenToWorld(p, this.cam, this.vp());
    let best: { id: string; y: number } | null = null;
    for (const n of this.nodes.values()) {
      const dx = (wp.x - n.data.x) / (392 * K * MINI * 1.05);
      const dy = (wp.y - (n.data.y - 22)) / (312 * K * TILT * MINI * 1.9);
      if (dx * dx + dy * dy <= 1 && (!best || n.data.y > best.y)) best = { id: n.data.id, y: n.data.y };
    }
    return best ? best.id : null;
  }

  private onDown(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.t < 0.95 && this.target === 0) return;
    if (this.t < 0.95) return;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.drag = null;
      this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.cam.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam: { ...this.cam } };
      return;
    }
    if (this.pointers.size === 1) this.drag = { x: p.x, y: p.y, cam: { ...this.cam }, moved: false };
  }

  private onMove(e: PointerEvent) {
    const p = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      this.app.canvas.style.cursor = this.target === 0 ? (this.planetHit(p) ? 'pointer' : 'default') : this.islandAt(p) ? 'pointer' : 'grab';
      return;
    }
    this.pointers.set(e.pointerId, p);
    if (this.pinch && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      this.cam = zoomWorldAt(this.pinch.cam, this.vp(), this.pinch.mid, this.pinch.zoom * (dist / this.pinch.dist));
      this.emitView();
      this.renderNow();
      return;
    }
    if (this.drag) {
      const d = this.drag;
      if (!d.moved && Math.hypot(p.x - d.x, p.y - d.y) < 6) return;
      d.moved = true;
      const s = worldFit(this.vp()) * d.cam.zoom;
      this.cam = clampWorldCamera({ ...d.cam, cx: d.cam.cx - (p.x - d.x) / s, cy: d.cam.cy - (p.y - d.y) / s });
      this.camTween = null;
      this.emitView();
      this.renderNow();
    }
  }

  private onUp(e: PointerEvent) {
    const p = this.local(e);
    const had = this.pointers.delete(e.pointerId);
    if (!had) return;
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    const d = this.drag;
    this.drag = null;
    if (this.target === 0) {
      if (this.planetHit(p)) this.enter();
      return;
    }
    if (d && !d.moved && this.t >= 0.95) {
      const id = this.islandAt(p);
      this.selectedId = id;
      this.cb.onSelect(id);
      this.updateRings();
      this.emitView();
      this.renderNow();
    }
  }
}
