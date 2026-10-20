import { Application, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { CATALOG, CATALOG_MAP } from '../catalog/catalog';
import { ERROR_TEXT, clampToWorld, validateObject } from '../domain/geometry';
import type { CatalogItem, PlacedObject } from '../domain/island';
import { glassBubble } from '../art/aero';
import { pencilSprite } from '../art/pencil';
import { GROUND_HALF, renderGround } from '../art/scenery';
import { AeroLife, loadLifeAssets } from './aeroLife';
import { WavingFlag } from './flag';
import { DEFAULT_CAMERA, clampCamera, fitScale, screenToScene, zoomAt, type Camera } from './camera';
import { K, TILT, project, unproject } from './projection';

export interface SceneCallbacks {
  onSelect(id: string | null): void;
  onPlace(x: number, y: number): void;
  onMove(id: string, x: number, y: number): void;
  onInvalid(text: string): void;
  onPop(info: { screenX: number; screenY: number; kind: 'burbuja' | 'dorada' | 'mariposa' | 'pez' }): void;
  onZoom(zoom: number): void;
}

export interface SceneProps {
  objects: readonly PlacedObject[];
  selectedId: string | null;
  /** id del catálogo en modo colocación. */
  placing: string | null;
  /** país elegido: se planta su bandera en la isla. */
  country?: string | null;
}

interface Entry {
  sprite: Sprite;
  obj: PlacedObject;
  item: CatalogItem;
  phase: number;
}

interface Bubble {
  sprite: Sprite;
  golden: boolean;
  x: number;
  y: number;
  vy: number;
  phase: number;
  age: number;
  life: number;
}

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  age: number;
}

const MAX_BUBBLES = 6;
const DRAG_THRESHOLD = 4;

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (h >>> 0) % 1000;
}

async function loadTexture(src: string, size = 256, opts = {}): Promise<Texture> {
  return Texture.from(await pencilSprite(src, size, opts));
}

const LEAF_URL = `${import.meta.env.BASE_URL}assets/ui/hoja.svg`;
const BUTTERFLY_URL = `${import.meta.env.BASE_URL}assets/ui/mariposa.svg`;

interface Leaf {
  sprite: Sprite;
  x: number;
  y: number;
  vy: number;
  sway: number;
  phase: number;
  spin: number;
}

export class IslandScene {
  private app!: Application;
  private root = new Container();
  private ground = new Sprite();
  private flag: WavingFlag | null = null;
  private flagCode: string | null = null;
  private life!: AeroLife;
  private lastSize = { w: 0, h: 0 };
  private ambient = new Container();
  private leaves: Leaf[] = [];
  private butterfly: Sprite | null = null;
  private butterflyCooldown = 0;
  private leafTex!: Texture;
  private butterflyTex!: Texture;
  private marks = new Graphics();
  private objLayer = new Container();
  private fx = new Container();
  private ghost = new Sprite();
  private textures = new Map<string, Texture>();
  private bubbleTex!: Texture;
  private goldTex!: Texture;
  private entries = new Map<string, Entry>();
  private bubbles: Bubble[] = [];
  private particles: Particle[] = [];
  private props: SceneProps = { objects: [], selectedId: null, placing: null };
  private camera: Camera = { ...DEFAULT_CAMERA };
  private pointers = new Map<number, { x: number; y: number }>();
  private mode: 'none' | 'place' | 'drag' | 'pan' | 'gesture' = 'none';
  private drag: { id: string; offX: number; offY: number; startX: number; startY: number; moved: boolean; world: { x: number; y: number }; valid: boolean } | null = null;
  private gesture: { dist: number; zoom: number; midX: number; midY: number; cam: Camera } | null = null;
  private panStart: { x: number; y: number; cam: Camera } | null = null;
  private ghostWorld: { x: number; y: number } | null = null;
  private lastTap = { t: 0, x: 0, y: 0 };
  private spawnTimer = 1;
  /** acercamiento de entrada: null cuando no está activo (movimiento reducido o ya terminó). */
  private intro: number | null = null;
  private time = 0;
  private reduced: boolean;
  private observer?: ResizeObserver;
  private interval?: number;
  private destroyed = false;
  private listeners: Array<() => void> = [];

  private constructor(private cb: SceneCallbacks, reduced: boolean) {
    this.reduced = reduced;
  }

  static async create(host: HTMLElement, cb: SceneCallbacks, reducedMotion: boolean): Promise<IslandScene> {
    const scene = new IslandScene(cb, reducedMotion);
    await scene.init(host);
    return scene;
  }

  private async init(host: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    try {
      const [leaf, butterfly, lifeAssets, ...items] = await Promise.all([
        loadTexture(LEAF_URL, 128, { grain: 0.6 }),
        loadTexture(BUTTERFLY_URL, 192, { grain: 0.6 }),
        loadLifeAssets(),
        ...CATALOG.map((c) => loadTexture(c.assetPath)),
      ]);
      this.bubbleTex = Texture.from(glassBubble(160, { seed: 3 }));
      this.goldTex = Texture.from(glassBubble(160, { seed: 4, tint: [255, 200, 90] }));
      this.life = new AeroLife(lifeAssets);
      this.leafTex = leaf;
      this.butterflyTex = butterfly;
      CATALOG.forEach((c, i) => this.textures.set(c.id, items[i]));
    } catch (e) {
      app.destroy(true, { children: true });
      throw new Error('no se pudieron cargar las texturas');
    }
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }

    const canvas = app.canvas;
    canvas.style.touchAction = 'none';
    canvas.style.display = 'block';
    host.appendChild(canvas);

    this.objLayer.sortableChildren = true;
    this.root.addChild(this.life.water, this.ground, this.marks, this.objLayer, this.fx, this.life.front, this.ambient);
    this.ghost.anchor.set(0.5, 0.9);
    this.ghost.alpha = 0.78;
    this.ghost.visible = false;
    this.ghost.zIndex = 1e9;
    this.objLayer.addChild(this.ghost);
    app.stage.addChild(this.life.bg, this.root, this.life.fg);
    this.setupGround();
    this.setupAmbient();

    this.bindInput(canvas);
    this.observer = new ResizeObserver(() => this.renderNow());
    this.observer.observe(host);
    this.listen(document, 'visibilitychange', () => this.syncRunning());

    app.ticker.add((t) => {
      this.update(t.deltaMS / 1000);
    });
    if (!this.reduced) {
      this.camera = { ...this.camera, zoom: 0.68 };
      this.intro = -0.35;
    }
    this.syncRunning();
    this.syncObjects();
    this.renderNow();
  }

  /* ---------- ciclo de vida ---------- */

  private listen(target: EventTarget, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn as EventListener, opts);
    this.listeners.push(() => target.removeEventListener(type, fn as EventListener, opts));
  }

  private syncRunning() {
    if (this.destroyed || !this.app) return;
    const hidden = document.hidden;
    window.clearInterval(this.interval);
    this.interval = undefined;
    if (this.reduced) {
      this.app.ticker.stop();
      if (!hidden) {
        this.interval = window.setInterval(() => {
          this.update(0.5);
          this.renderNow();
        }, 500);
      }
    } else if (hidden) {
      this.app.ticker.stop();
    } else {
      this.app.ticker.start();
    }
  }

  setReducedMotion(reduced: boolean) {
    this.reduced = reduced;
    this.syncRunning();
    this.renderNow();
  }

  destroy() {
    this.destroyed = true;
    window.clearInterval(this.interval);
    this.observer?.disconnect();
    this.listeners.forEach((off) => off());
    this.listeners = [];
    if (this.app) {
      this.app.ticker.stop();
      this.app.destroy(true, { children: true });
    }
  }

  /* ---------- estado ---------- */

  setProps(props: SceneProps) {
    const placingChanged = props.placing !== this.props.placing;
    this.props = props;
    if (!this.app) return;
    this.syncFlag();
    if (placingChanged) this.endGhost();
    this.syncObjects();
    this.renderNow();
  }

  getZoom(): number {
    return this.camera.zoom;
  }

  resetCamera() {
    this.camera = { ...DEFAULT_CAMERA };
    this.cb.onZoom(this.camera.zoom);
    this.renderNow();
  }

  /** fija el zoom de la cámara del juego (0.5–2.5) manteniendo el centro. */
  setZoom(z: number) {
    const vp = this.viewport();
    this.camera = zoomAt(this.camera, vp, { x: vp.width / 2, y: vp.height * 0.45 }, z);
    this.cb.onZoom(this.camera.zoom);
    this.renderNow();
  }

  /**
   * fotografía real de la escena visible: fondo del lago + capas de pixi, sin controles html ni marcas de edición.
   * devuelve un jpeg comprimido (lado mayor <= maxEdge).
   */
  async capture(maxEdge = 1280, quality = 0.82): Promise<{ blob: Blob; width: number; height: number } | null> {
    if (this.destroyed || !this.app) return null;
    const marksVisible = this.marks.visible;
    const ghostVisible = this.ghost.visible;
    this.marks.visible = false;
    this.ghost.visible = false;
    try {
      this.renderNow();
      const vp = this.viewport();
      const res = Math.min(2, this.app.renderer.resolution);
      const layers = this.app.renderer.extract.canvas({ target: this.app.stage, frame: new Rectangle(0, 0, vp.width, vp.height), resolution: res }) as HTMLCanvasElement;
      const scale = Math.min(1, maxEdge / Math.max(vp.width * res, vp.height * res));
      const w = Math.max(1, Math.round(vp.width * res * scale));
      const h = Math.max(1, Math.round(vp.height * res * scale));
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d')!;
      const bg = document.querySelector<HTMLCanvasElement>('.scene__paper');
      if (bg) ctx.drawImage(bg, 0, 0, w, h);
      ctx.drawImage(layers, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', quality));
      return blob ? { blob, width: w, height: h } : null;
    } finally {
      this.marks.visible = marksVisible;
      this.ghost.visible = ghostVisible;
      this.renderNow();
    }
  }

  zoomBy(factor: number) {
    const vp = this.viewport();
    this.camera = zoomAt(this.camera, vp, { x: vp.width / 2, y: vp.height * 0.45 }, this.camera.zoom * factor);
    this.cb.onZoom(this.camera.zoom);
    this.renderNow();
  }

  /** cancela arrastre o colocación en curso (tecla escape). */
  cancelInteraction() {
    if (this.drag) this.revertDrag();
    this.endGhost();
    this.mode = 'none';
    this.renderNow();
  }

  private viewport() {
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  private applyCamera() {
    const vp = this.viewport();
    const s = fitScale(vp) * this.camera.zoom;
    this.root.position.set(vp.width / 2 + this.camera.panX, vp.height * 0.45 + this.camera.panY);
    this.root.scale.set(s);
  }

  renderNow() {
    if (this.destroyed || !this.app) return;
    const vp = this.viewport();
    if (vp.width !== this.lastSize.w || vp.height !== this.lastSize.h) {
      this.lastSize = { w: vp.width, h: vp.height };
      this.life.layout(vp.width, vp.height);
    }
    this.camera = clampCamera(this.camera, vp);
    this.applyCamera();
    this.drawMarks();
    this.app.render();
  }

  /* ---------- dibujo ---------- */

  private setupGround() {
    const canvas = renderGround();
    this.ground.texture = Texture.from(canvas);
    this.ground.anchor.set(0.5);
    this.ground.scale.set(GROUND_HALF.w / (canvas.width / 2));
  }

  private setupAmbient() {
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 7; i++) {
      const sprite = new Sprite(this.leafTex);
      sprite.anchor.set(0.5);
      const size = rand(16, 26);
      sprite.scale.set(size / this.leafTex.width);
      const leaf: Leaf = { sprite, x: rand(-520, 520), y: rand(-330, 330), vy: rand(10, 20), sway: rand(14, 34), phase: rand(0, 6), spin: rand(-0.8, 0.8) };
      sprite.position.set(leaf.x, leaf.y);
      sprite.rotation = rand(0, 6);
      sprite.alpha = 0.92;
      this.ambient.addChild(sprite);
      this.leaves.push(leaf);
    }
    const b = new Sprite(this.butterflyTex);
    b.anchor.set(0.5);
    b.scale.set(58 / this.butterflyTex.width);
    this.ambient.addChild(b);
    this.butterfly = b;
    this.placeButterfly();
  }

  private placeButterfly() {
    const b = this.butterfly;
    if (!b || !b.visible) return;
    const t = this.time * 0.35;
    b.x = Math.sin(t) * 330 + Math.sin(t * 2.3) * 40;
    b.y = Math.cos(t * 0.8) * 120 - 120 + Math.sin(t * 3.1) * 16;
    b.rotation = Math.cos(t) * 0.25;
    const flap = this.reduced ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(this.time * 9));
    b.scale.x = (58 / this.butterflyTex.width) * flap;
  }

  private drawMarks() {
    const m = this.marks;
    m.clear();
    const draw = (world: { x: number; y: number }, item: CatalogItem, scale: number, color: number, alpha: number) => {
      const p = project(world.x, world.y);
      m.ellipse(p.x, p.y, item.footprintRadius * scale * K, item.footprintRadius * scale * K * TILT).fill({ color, alpha: alpha * 0.35 }).stroke({ width: 3, color: 0xffffff, alpha: 0.9 });
    };
    const sel = this.props.selectedId ? this.entries.get(this.props.selectedId) : undefined;
    if (sel) {
      const w = this.drag && this.drag.id === sel.obj.id ? this.drag.world : sel.obj;
      const ok = !this.drag || this.drag.valid;
      draw(w, sel.item, sel.obj.scale, ok ? 0xb8ff6a : 0xff6a6a, 1);
    }
    if (this.ghost.visible && this.ghostWorld && this.props.placing) {
      const item = CATALOG_MAP.get(this.props.placing);
      if (item) draw(this.ghostWorld, item, 1, this.ghostValid() ? 0xb8ff6a : 0xff6a6a, 1);
    }
  }

  private place(entry: Entry, x: number, y: number) {
    const p = project(x, y);
    entry.sprite.position.set(p.x, p.y);
    entry.sprite.zIndex = p.y + hash(entry.obj.id) / 1e6;
  }

  private styleSprite(s: Sprite, item: CatalogItem, scale: number, rotation: number) {
    const tex = this.textures.get(item.id)!;
    const k = (item.spriteSize * scale) / tex.width;
    s.scale.set(rotation % 2 ? -k : k, k);
  }

  /** planta la bandera del país elegido en el borde trasero izquierdo de la isla. */
  private syncFlag() {
    const code = this.props.country ?? null;
    if (code === this.flagCode && (this.flag || !code)) return;
    this.flag?.destroy({ children: true });
    this.flag = null;
    this.flagCode = code;
    if (!code) return;
    const f = new WavingFlag(code, { pole: 118, cloth: 84 });
    const p = project(285, 500);
    f.position.set(p.x, p.y);
    f.zIndex = p.y + 0.5;
    this.objLayer.addChild(f);
    this.flag = f;
  }

  private syncObjects() {
    const ids = new Set<string>();
    for (const obj of this.props.objects) {
      ids.add(obj.id);
      const item = CATALOG_MAP.get(obj.assetId);
      const tex = this.textures.get(obj.assetId);
      if (!item || !tex) continue;
      let entry = this.entries.get(obj.id);
      if (!entry) {
        const sprite = new Sprite(tex);
        sprite.anchor.set(0.5, item.anchorY);
        this.objLayer.addChild(sprite);
        entry = { sprite, obj, item, phase: (hash(obj.id) / 1000) * Math.PI * 2 };
        this.entries.set(obj.id, entry);
      }
      entry.obj = obj;
      this.styleSprite(entry.sprite, item, obj.scale, obj.rotation);
      if (!(this.drag && this.drag.id === obj.id && this.drag.moved)) this.place(entry, obj.x, obj.y);
    }
    for (const [id, entry] of this.entries) {
      if (!ids.has(id)) {
        entry.sprite.destroy();
        this.entries.delete(id);
      }
    }
  }

  /* ---------- animación y burbujas ---------- */

  private update(dt: number) {
    this.time += dt;
    if (this.intro !== null) {
      this.intro += dt / 1.3;
      const k = Math.min(1, Math.max(0, this.intro));
      const e = 1 - Math.pow(1 - k, 3);
      this.camera = clampCamera({ ...this.camera, zoom: 0.68 + (1 - 0.68) * e }, this.viewport());
      if (this.intro >= 1) this.intro = null;
      this.cb.onZoom(this.camera.zoom);
    }
    this.life.update(dt, this.reduced);
    if (!this.reduced) this.flag?.update(this.time);
    if (!this.reduced) {
      for (const e of this.entries.values()) {
        if (e.item.placementZone === 'water' && !(this.drag && this.drag.id === e.obj.id && this.drag.moved)) {
          const p = project(e.obj.x, e.obj.y);
          e.sprite.y = p.y + Math.sin(this.time * 1.6 + e.phase) * 4;
        }
      }
      for (const l of this.leaves) {
        l.y += l.vy * dt;
        if (l.y > 340) {
          l.y = -340;
          l.x = (Math.random() * 2 - 1) * 520;
        }
        l.sprite.x = l.x + Math.sin(this.time * 0.9 + l.phase) * l.sway;
        l.sprite.y = l.y;
        l.sprite.rotation += l.spin * dt;
      }
    }

    if (this.butterfly) {
      if (!this.butterfly.visible) {
        this.butterflyCooldown -= dt;
        if (this.butterflyCooldown <= 0) this.butterfly.visible = true;
      }
      this.placeButterfly();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.bubbles.length < MAX_BUBBLES) {
      this.spawnBubble();
      this.spawnTimer = 1.4 + Math.random() * 1.8;
    } else if (this.spawnTimer <= 0) {
      this.spawnTimer = 1;
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age += dt;
      if (!this.reduced) {
        b.y -= b.vy * dt;
        b.sprite.x = b.x + Math.sin(this.time * 1.3 + b.phase) * 10;
        b.sprite.y = b.y;
      }
      const left = b.life - b.age;
      b.sprite.alpha = Math.min(1, left / 2, b.age / 0.4 + 0.2);
      if (left <= 0) {
        b.sprite.destroy();
        this.bubbles.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = Math.max(0, 1 - p.age / 0.5);
      if (p.age >= 0.5) {
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnBubble() {
    const golden = Math.random() < 0.12;
    const sprite = new Sprite(golden ? this.goldTex : this.bubbleTex);
    sprite.anchor.set(0.5);
    const size = (golden ? 68 : 54) * (0.85 + Math.random() * 0.35);
    sprite.scale.set(size / this.bubbleTex.width);
    const x = (Math.random() * 2 - 1) * 330;
    const y = -40 + Math.random() * 190;
    sprite.position.set(x, y);
    sprite.alpha = 0;
    this.fx.addChild(sprite);
    this.bubbles.push({ sprite, golden, x, y, vy: 8 + Math.random() * 10, phase: Math.random() * 6, age: 0, life: 11 + Math.random() * 4 });
  }

  private popBubble(index: number) {
    const b = this.bubbles[index];
    const vp = this.viewport();
    const s = fitScale(vp) * this.camera.zoom;
    const screenX = vp.width / 2 + this.camera.panX + b.sprite.x * s;
    const screenY = vp.height * 0.45 + this.camera.panY + b.sprite.y * s;
    if (!this.reduced) {
      for (let i = 0; i < 8; i++) {
        const sp = new Sprite(b.golden ? this.goldTex : this.bubbleTex);
        sp.anchor.set(0.5);
        sp.scale.set(0.35 * (b.sprite.scale.x));
        sp.position.copyFrom(b.sprite.position);
        this.fx.addChild(sp);
        const a = (i / 8) * Math.PI * 2;
        this.particles.push({ sprite: sp, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, age: 0 });
      }
    }
    const bx = b.sprite.x;
    const by = b.sprite.y;
    b.sprite.destroy();
    this.bubbles.splice(index, 1);
    this.life.burst(bx, by);
    this.cb.onPop({ screenX, screenY, kind: b.golden ? 'dorada' : 'burbuja' });
    this.renderNow();
  }

  /* ---------- entrada ---------- */

  private local(e: PointerEvent | WheelEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private worldAt(screen: { x: number; y: number }) {
    const sc = screenToScene(screen, this.camera, this.viewport());
    return unproject(sc.x, sc.y);
  }

  private bindInput(canvas: HTMLCanvasElement) {
    this.listen(canvas, 'pointerdown', (e: PointerEvent) => this.onDown(e));
    this.listen(canvas, 'pointermove', (e: PointerEvent) => this.onMove(e));
    this.listen(canvas, 'pointerup', (e: PointerEvent) => this.onUp(e));
    this.listen(canvas, 'pointercancel', (e: PointerEvent) => this.onCancel(e));
    this.listen(canvas, 'pointerleave', (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && this.pointers.size === 0) {
        this.endGhost();
        this.renderNow();
      }
    });
    this.listen(
      canvas,
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.intro = null;
        const at = this.local(e);
        this.camera = zoomAt(this.camera, this.viewport(), at, this.camera.zoom * Math.exp(-e.deltaY * 0.0015));
        this.cb.onZoom(this.camera.zoom);
        this.renderNow();
      },
      { passive: false },
    );
  }

  private hitBubble(p: { x: number; y: number }): number {
    const vp = this.viewport();
    const s = fitScale(vp) * this.camera.zoom;
    let best = -1;
    let bestD = Infinity;
    this.bubbles.forEach((b, i) => {
      const bx = vp.width / 2 + this.camera.panX + b.sprite.x * s;
      const by = vp.height * 0.45 + this.camera.panY + b.sprite.y * s;
      const radius = Math.max(26, (b.sprite.width / 2) * s * 1.25);
      const d = Math.hypot(p.x - bx, p.y - by);
      if (d <= radius && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  private hitButterfly(p: { x: number; y: number }): boolean {
    const b = this.butterfly;
    if (!b || !b.visible) return false;
    const vp = this.viewport();
    const s = fitScale(vp) * this.camera.zoom;
    const bx = vp.width / 2 + this.camera.panX + b.x * s;
    const by = vp.height * 0.45 + this.camera.panY + b.y * s;
    if (Math.hypot(p.x - bx, p.y - by) > Math.max(34, 36 * s)) return false;
    b.visible = false;
    this.butterflyCooldown = 25;
    this.cb.onPop({ screenX: bx, screenY: by, kind: 'mariposa' });
    this.renderNow();
    return true;
  }

  private hitObject(p: { x: number; y: number }): Entry | null {
    const sorted = [...this.entries.values()].sort((a, b) => b.sprite.zIndex - a.sprite.zIndex);
    for (const e of sorted) {
      const r = e.sprite.getBounds().rectangle;
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const dx = (p.x - cx) / (r.width / 2 * 0.85);
      const dy = (p.y - cy) / (r.height / 2 * 0.92);
      if (dx * dx + dy * dy <= 1) return e;
    }
    return null;
  }

  private onDown(e: PointerEvent) {
    this.intro = null;
    const p = this.local(e);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, p);

    if (this.pointers.size === 2) {
      this.startGesture();
      return;
    }
    if (this.pointers.size > 2) return;

    const jp = this.life.jumperPosition();
    if (jp) {
      const vp = this.viewport();
      const sc = fitScale(vp) * this.camera.zoom;
      const jx = vp.width / 2 + this.camera.panX + jp.x * sc;
      const jy = vp.height * 0.45 + this.camera.panY + jp.y * sc;
      if (Math.hypot(p.x - jx, p.y - jy) <= Math.max(38, jp.radius * sc)) {
        this.life.catchJumper();
        this.mode = 'none';
        this.cb.onPop({ screenX: jx, screenY: jy, kind: 'pez' });
        this.renderNow();
        return;
      }
    }
    if (this.hitButterfly(p)) {
      this.mode = 'none';
      return;
    }
    const bubble = this.hitBubble(p);
    if (bubble >= 0) {
      this.mode = 'none';
      this.popBubble(bubble);
      return;
    }

    if (this.props.placing) {
      this.mode = 'place';
      this.moveGhost(p);
      return;
    }

    const hit = this.hitObject(p);
    if (hit) {
      this.cb.onSelect(hit.obj.id);
      const w = this.worldAt(p);
      this.mode = 'drag';
      this.drag = { id: hit.obj.id, offX: w.x - hit.obj.x, offY: w.y - hit.obj.y, startX: p.x, startY: p.y, moved: false, world: { x: hit.obj.x, y: hit.obj.y }, valid: true };
    } else {
      this.cb.onSelect(null);
      const now = performance.now();
      if (now - this.lastTap.t < 320 && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 24) {
        this.lastTap = { t: 0, x: 0, y: 0 };
        this.resetCamera();
        return;
      }
      this.lastTap = { t: now, x: p.x, y: p.y };
      if (e.pointerType === 'mouse') {
        this.mode = 'pan';
        this.panStart = { x: p.x, y: p.y, cam: { ...this.camera } };
      } else {
        this.mode = 'none';
      }
    }
    this.renderNow();
  }

  private onMove(e: PointerEvent) {
    const p = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && this.props.placing && this.pointers.size === 0) {
        this.moveGhost(p);
      }
      return;
    }
    this.pointers.set(e.pointerId, p);

    if (this.mode === 'gesture') return this.updateGesture();
    if (this.mode === 'place') return this.moveGhost(p);
    if (this.mode === 'pan' && this.panStart) {
      this.camera = clampCamera({ ...this.panStart.cam, panX: this.panStart.cam.panX + p.x - this.panStart.x, panY: this.panStart.cam.panY + p.y - this.panStart.y }, this.viewport());
      this.renderNow();
      return;
    }
    if (this.mode === 'drag' && this.drag) {
      const d = this.drag;
      if (!d.moved && Math.hypot(p.x - d.startX, p.y - d.startY) < DRAG_THRESHOLD) return;
      d.moved = true;
      const w = this.worldAt(p);
      d.world = clampToWorld(w.x - d.offX, w.y - d.offY);
      const entry = this.entries.get(d.id);
      if (!entry) return;
      d.valid = validateObject(entry.item, { x: d.world.x, y: d.world.y, scale: entry.obj.scale, rotation: entry.obj.rotation }) === null;
      this.place(entry, d.world.x, d.world.y);
      entry.sprite.tint = d.valid ? 0xffffff : 0xff8a8a;
      this.renderNow();
    }
  }

  private onUp(e: PointerEvent) {
    const had = this.pointers.has(e.pointerId);
    const p = this.local(e);
    this.pointers.delete(e.pointerId);
    if (!had) return;

    if (this.mode === 'gesture') {
      if (this.pointers.size < 2) {
        this.gesture = null;
        this.mode = 'none';
      }
      return;
    }

    if (this.mode === 'place') {
      this.moveGhost(p);
      if (this.ghostWorld) {
        if (this.ghostValid()) this.cb.onPlace(this.ghostWorld.x, this.ghostWorld.y);
        else this.cb.onInvalid(ERROR_TEXT['fuera-de-zona']);
      }
      if (e.pointerType !== 'mouse') this.endGhost();
    } else if (this.mode === 'drag' && this.drag) {
      const d = this.drag;
      this.drag = null;
      const entry = this.entries.get(d.id);
      if (entry) entry.sprite.tint = 0xffffff;
      if (d.moved) {
        if (d.valid) this.cb.onMove(d.id, d.world.x, d.world.y);
        else {
          if (entry) this.place(entry, entry.obj.x, entry.obj.y);
          this.cb.onInvalid(ERROR_TEXT['fuera-de-zona']);
        }
      }
    }
    this.mode = 'none';
    this.panStart = null;
    this.renderNow();
  }

  private onCancel(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.drag) this.revertDrag();
    if (this.mode === 'place' && e.pointerType !== 'mouse') this.endGhost();
    if (this.pointers.size < 2) this.gesture = null;
    this.mode = 'none';
    this.panStart = null;
    this.renderNow();
  }

  private revertDrag() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const entry = this.entries.get(d.id);
    if (entry) {
      entry.sprite.tint = 0xffffff;
      this.place(entry, entry.obj.x, entry.obj.y);
    }
  }

  private startGesture() {
    if (this.drag) this.revertDrag();
    this.endGhost();
    const [a, b] = [...this.pointers.values()];
    this.mode = 'gesture';
    this.gesture = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.camera.zoom, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2, cam: { ...this.camera } };
    this.renderNow();
  }

  private updateGesture() {
    const g = this.gesture;
    if (!g || this.pointers.size < 2) return;
    const [a, b] = [...this.pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const zoomed = zoomAt(g.cam, this.viewport(), { x: g.midX, y: g.midY }, g.zoom * (dist / g.dist));
    this.camera = clampCamera({ ...zoomed, panX: zoomed.panX + mid.x - g.midX, panY: zoomed.panY + mid.y - g.midY }, this.viewport());
    this.cb.onZoom(this.camera.zoom);
    this.renderNow();
  }

  /* ---------- colocación ---------- */

  private moveGhost(p: { x: number; y: number }) {
    const id = this.props.placing;
    const item = id ? CATALOG_MAP.get(id) : undefined;
    const tex = id ? this.textures.get(id) : undefined;
    if (!item || !tex) return;
    const w = clampToWorld(this.worldAt(p).x, this.worldAt(p).y);
    this.ghostWorld = w;
    const pr = project(w.x, w.y);
    this.ghost.texture = tex;
    this.ghost.anchor.set(0.5, item.anchorY);
    this.ghost.scale.set(item.spriteSize / tex.width);
    this.ghost.position.set(pr.x, pr.y);
    this.ghost.visible = true;
    this.ghost.tint = this.ghostValid() ? 0xffffff : 0xff8a8a;
    this.renderNow();
  }

  private ghostValid(): boolean {
    const item = this.props.placing ? CATALOG_MAP.get(this.props.placing) : undefined;
    if (!item || !this.ghostWorld) return false;
    return validateObject(item, { x: this.ghostWorld.x, y: this.ghostWorld.y, scale: 1, rotation: 0 }) === null;
  }

  private endGhost() {
    this.ghost.visible = false;
    this.ghostWorld = null;
  }
}
