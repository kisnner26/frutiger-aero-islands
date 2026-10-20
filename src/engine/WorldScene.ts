import { Application, Container, Graphics, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { CATALOG_MAP } from '../catalog/catalog';
import { renderBasin, renderGlassFrame, renderHalo, renderPlanet, renderWorldSky } from '../art/planet';
import { pencilSprite } from '../art/pencil';
import { GROUND_HALF, renderGround } from '../art/scenery';
import { landTier } from '../domain/geometry';
import { loadLifeAssets, type LifeAssets } from './aeroLife';
import { WavingFlag } from './flag';
import { K, TILT, project } from './projection';
import { BASIN_RADIUS, DEFAULT_WORLD_CAMERA, clampWorldCamera, screenToWorld, worldFit, zoomWorldAt, type WorldCamera } from '../world/worldCamera';
import type { WorldIsland } from '../world/archipelago';
import type { WorldView } from '../world/worldState';
import { COUNTRIES } from '../world/countries';
import { ALL_CELLS, CELL, cellAt, cellCenter, cellKey, ownerColor, type CellInfo } from '../world/territory';
import { countryAnchor, unprojectXY } from '../world/geoProjection';
import type { Globe3D } from './Globe3D';
import { OrbitalAccents, SeaTraffic } from './worldExtras';
import { pencilSprite as pencilTex } from '../art/pencil';
import { rendererResolution, tickerFrameLimit } from './devicePerformance';

export interface WorldCallbacks {
  onSelect(id: string | null): void;
  onView(view: WorldView): void;
  onMode(mode: 'lejos' | 'dentro'): void;
  onCountry(code: string): void;
  onCell?(cx: number, cy: number): void;
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
/** objetos feos que desaparecen al restaurar la zona: chimeneas, ruinas, árboles secos, basura y charcos. */
function drawBlight(g: Graphics, x: number, y: number, seed: number, damage: number) {
  const variant = ((seed % 5) + 5) % 5;
  const a = Math.min(1, damage * 1.2);
  if (damage > 0.05) {
    const ink = 0x3c4146;
    if (variant === 0) {
      g.rect(x - 7, y - 24, 14, 30).fill({ color: 0x8a8f94, alpha: a }).stroke({ width: 2, color: ink, alpha: a });
      g.rect(x - 9, y - 28, 18, 6).fill({ color: 0x5a5f64, alpha: a }).stroke({ width: 1.5, color: ink, alpha: a });
      for (const [dx, dy, r] of [[2, -40, 6], [8, -50, 8], [0, -62, 10]] as const) g.circle(x + dx, y + dy, r).fill({ color: 0x9aa0a6, alpha: a * 0.55 });
    } else if (variant === 1) {
      g.poly([x - 20, y + 8, x - 20, y - 14, x - 8, y - 22, x - 2, y - 10, x + 6, y - 18, x + 20, y - 4, x + 20, y + 8]).fill({ color: 0x9a9084, alpha: a }).stroke({ width: 2, color: ink, alpha: a });
      g.moveTo(x - 8, y - 22).lineTo(x - 6, y + 8).stroke({ width: 1.5, color: ink, alpha: a * 0.7 });
      g.rect(x + 2, y - 4, 6, 8).fill({ color: 0x4a4540, alpha: a });
    } else if (variant === 2) {
      g.moveTo(x, y + 8).lineTo(x, y - 24).stroke({ width: 4, color: 0x5a4a3a, alpha: a });
      for (const [dx, dy] of [[-14, -30], [12, -34], [-10, -16], [14, -20]] as const) g.moveTo(x, y - 12 + dy / 4).lineTo(x + dx, y + dy).stroke({ width: 2.4, color: 0x5a4a3a, alpha: a });
    } else if (variant === 3) {
      for (const [dx, dy, w, h, c] of [[-14, 0, 14, 8, 0x7a7f84], [2, -4, 12, 10, 0x6a5a48], [-4, -10, 10, 8, 0x8a8f94], [12, 2, 10, 7, 0x5a6a70]] as const) g.rect(x + dx, y + dy, w, h).fill({ color: c, alpha: a }).stroke({ width: 1.4, color: ink, alpha: a });
    } else {
      g.ellipse(x, y + 2, 24, 8).fill({ color: 0x2c2a3a, alpha: a * 0.85 });
      g.ellipse(x - 6, y, 10, 3).fill({ color: 0x7a5a9a, alpha: a * 0.5 });
    }
  } else {
    // zona restaurada: matas y una flor
    g.ellipse(x, y + 6, 12, 4).fill({ color: 0x7ccb48, alpha: 0.9 });
    g.circle(x - 4, y + 2, 3.2).fill({ color: 0xff7aa8 });
    g.circle(x + 6, y + 4, 2.6).fill({ color: 0xffffff });
  }
}

export class WorldScene {
  private app!: Application;
  private sky = new Sprite();
  private far = new Container();
  private halo = new Sprite();
  private planet = new Sprite();
  private accents = new OrbitalAccents();
  private traffic: SeaTraffic | null = null;
  private globe: Globe3D | null = null;
  private territory = new Graphics();
  private blight = new Graphics();
  private cells = new Map<string, CellInfo>();
  private myName: string | null = null;
  private mapMode = false;
  private pickedCell: { cx: number; cy: number } | null = null;
  private pinCode: string | null = null;
  private interior = new Container();
  private inner = new Container();
  private mask = new Graphics();
  private basin = new Sprite();
  private caustics!: TilingSprite;
  private under = new Container();
  private routes = new Graphics();
  private countryMarkers = new Graphics();
  private countryLabels = new Container();
  private labelNodes: Array<{ code: string; x: number; y: number; text: Text }> = [];
  private focusHalo = new Graphics();
  private focusCode: string | null = null;
  private islandLayer = new Container();
  private overlay = new Container();
  private frame = new Sprite();
  private nodes = new Map<string, IslandNode>();
  private swimmers: Swimmer[] = [];
  private bubbles: Bubble[] = [];
  private assets!: LifeAssets;
  private groundTex = new Map<number, Texture>();
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
    await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: rendererResolution(1.5) });
    if (this.destroyed) {
      app.destroy(true, { children: true });
      return;
    }
    this.app = app;
    try {
      const ids = [...new Set(islands.flatMap((i) => i.objects.map((o) => o.assetId)))];
      const base = import.meta.env.BASE_URL;
      const [assets, boat, dolphin, ...tex] = await Promise.all([loadLifeAssets(), pencilTex(`${base}assets/decorations/velero.svg`), pencilTex(`${base}assets/decorations/delfin.svg`), ...ids.map(async (id) => Texture.from(await pencilSprite(CATALOG_MAP.get(id)!.assetPath)))]);
      this.traffic = new SeaTraffic({ velero: Texture.from(boat), delfin: Texture.from(dolphin) });
      this.assets = assets;
      ids.forEach((id, i) => this.objTex.set(id, tex[i]));
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
    try {
      const { Globe3D: Globe } = await import('./Globe3D');
      if (this.destroyed) return;
      this.globe = new Globe(host, {
        onCountry: (code) => {
          this.markCountry(code);
          this.cb.onCountry(code);
        },
        onEnter: () => this.enter(),
      });
      this.globe.reduced = this.reduced;
    } catch {
      // sin webgl: planeta plano de reserva
      this.planet.texture = Texture.from(renderPlanet(720));
      this.planet.visible = true;
    }
    app.canvas.style.touchAction = 'none';
    app.canvas.style.display = 'block';

    this.planet.anchor.set(0.5);
    this.halo.anchor.set(0.5);
    this.far.sortableChildren = true;
    this.halo.zIndex = -5;
    this.planet.zIndex = 0;
    this.planet.visible = false;
    this.far.addChild(this.halo, this.planet, this.accents.root);

    this.basin.anchor.set(0.5);
    const basinR = this.basin.texture.width / 2 - 6;
    this.basin.scale.set(BASIN_RADIUS / basinR);
    this.caustics = new TilingSprite({ texture: this.assets.caustics, width: BASIN_RADIUS * 2, height: BASIN_RADIUS * 2 });
    this.caustics.anchor.set(0.5);
    this.caustics.blendMode = 'add';
    this.caustics.alpha = 0.13;
    this.caustics.tileScale.set(1.8);
    this.islandLayer.sortableChildren = true;
    this.inner.addChild(this.basin, this.caustics, this.under, this.routes, this.territory, this.blight, this.countryMarkers, this.focusHalo, this.countryLabels, this.islandLayer, this.overlay);
    this.frame.anchor.set(0.5);
    this.interior.addChild(this.inner, this.frame);
    this.interior.mask = this.mask;
    app.stage.addChild(this.sky, this.far, this.interior, this.mask);
    this.sky.anchor.set(0);

    if (this.traffic) this.under.addChild(this.traffic.root);
    this.buildCountryMarkers();
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
    app.ticker.maxFPS = tickerFrameLimit();
    this.syncRunning();
    this.updateRings();
    this.renderNow();
  }

  /* ---------- construcción ---------- */

  /** puntos de entrada del atlas: se dibujan en una sola capa para no crear cientos de nodos DOM o sprites. */
  private buildCountryMarkers() {
    for (const country of COUNTRIES) {
      const point = countryAnchor(country.code);
      this.countryMarkers.circle(point.x, point.y, 7).fill({ color: 0xd8fbff, alpha: 0.8 });
      this.countryMarkers.circle(point.x, point.y, 11).stroke({ width: 2, color: 0x319ed0, alpha: 0.68 });
    }
  }

  /** añade islas nuevas (por ejemplo las de un país que se acaba de abrir) sin reconstruir el mundo. */
  async addIslands(list: WorldIsland[]) {
    const fresh = list.filter((i) => !this.nodes.has(i.id) && i.objects.every((o) => CATALOG_MAP.has(o.assetId)));
    if (!fresh.length || this.destroyed || !this.app) return;
    const need = [...new Set(fresh.flatMap((i) => i.objects.map((o) => o.assetId)))].filter((id) => !this.objTex.has(id));
    const tex = await Promise.all(need.map(async (id) => Texture.from(await pencilSprite(CATALOG_MAP.get(id)!.assetPath))));
    if (this.destroyed) return;
    need.forEach((id, i) => this.objTex.set(id, tex[i]));
    this.buildIslands(fresh.filter((i) => !this.nodes.has(i.id)));
    if (this.focusCode) this.focusCountry(this.focusCode);
    this.renderNow();
  }

  private buildIslands(islands: WorldIsland[]) {
    for (const data of islands) {
      const box = new Container();
      box.position.set(data.x, data.y);
      box.zIndex = data.y;
      const tier = landTier(data.level);
      let groundTex = this.groundTex.get(tier);
      if (!groundTex) {
        groundTex = Texture.from(renderGround(data.level));
        this.groundTex.set(tier, groundTex);
      }
      const ground = new Sprite(groundTex);
      ground.anchor.set(0.5);
      ground.scale.set((GROUND_HALF.w * 2 * MINI) / groundTex.width);
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
    this.globe?.resize(w, h, planetPx);
    if (this.planet.visible) this.planet.scale.set(planetPx / this.planet.texture.width);
    this.halo.scale.set((planetPx * 1.55) / this.halo.texture.width);
    this.markCountry(this.pinCode);
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
    if (this.globe) this.globe.reduced = reduced;
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
    this.globe?.destroy();
    this.globe = null;
    this.listeners.forEach((off) => off());
    this.listeners = [];
    if (this.app) {
      this.app.ticker.stop();
      this.app.destroy(true, { children: true });
    }
  }

  /* ---------- territorio ---------- */

  setTerritory(cells: Map<string, CellInfo>, myName: string | null) {
    this.cells = cells;
    this.myName = myName;
    this.drawTerritory();
    const bad = [...cells.values()].filter((c) => c.blight);
    const done = bad.reduce((a, c) => a + c.progress, 0);
    this.globe?.setRestoration(bad.length ? done / (bad.length * 100) : 1);
    this.globe?.setDamage(
      bad.map((c) => {
        const p = cellCenter(c.cx, c.cy);
        return { ...unprojectXY(p.x, p.y), damage: 1 - c.progress / 100 };
      }),
    );
  }

  setMapMode(on: boolean) {
    this.mapMode = on;
    if (!on) this.pickedCell = null;
    this.drawTerritory();
    this.renderNow();
  }

  selectCell(cell: { cx: number; cy: number } | null) {
    this.pickedCell = cell;
    this.drawTerritory();
    this.renderNow();
  }

  private drawTerritory() {
    const g = this.territory;
    g.clear();
    this.blight.clear();
    const now = Date.now();
    for (const { cx, cy } of ALL_CELLS) {
      const info = this.cells.get(cellKey(cx, cy));
      const { x, y } = cellCenter(cx, cy);
      const h = CELL / 2;
      const progress = info?.progress ?? 0;
      // solo hay zonas dañadas en unos pocos rincones; el resto del mundo está sano
      const damage = info?.blight ? 1 - progress / 100 : 0;
      if (info?.blight && damage > 0) {
        g.rect(x - h, y - h, CELL, CELL).fill({ color: 0x7d858c, alpha: 0.46 * damage });
        if (damage > 0.5) {
          g.moveTo(x - h * 0.7, y - h * 0.2).lineTo(x - h * 0.1, y + h * 0.1).lineTo(x + h * 0.2, y - h * 0.35).lineTo(x + h * 0.7, y + h * 0.15).stroke({ width: 1.6, color: 0x4a4f55, alpha: 0.35 * damage });
          g.moveTo(x - h * 0.3, y + h * 0.6).lineTo(x + h * 0.1, y + h * 0.25).stroke({ width: 1.4, color: 0x4a4f55, alpha: 0.3 * damage });
        }
      } else if (info?.blight) {
        g.circle(x - h * 0.45, y - h * 0.4, 2.4).fill({ color: 0xffffff, alpha: 0.9 });
        g.circle(x + h * 0.5, y + h * 0.3, 1.8).fill({ color: 0xd8fbff, alpha: 0.9 });
      }
      const hsh = (Math.imul(cx + 11, 73856093) ^ Math.imul(cy + 7, 19349663)) >>> 0;
      if (info?.blight) drawBlight(this.blight, x + ((hsh >>> 3) % 31) - 15, y + ((hsh >>> 9) % 23) - 11, hsh >>> 5, damage);
      if (info?.owner) {
        const mine = info.owner === this.myName;
        const color = ownerColor(info.owner);
        g.rect(x - h + 2, y - h + 2, CELL - 4, CELL - 4).fill({ color, alpha: 0.28 }).stroke({ width: mine ? 4 : 2.5, color: mine ? 0xffffff : color, alpha: mine ? 0.95 : 0.85 });
        if (info.shieldUntil > now) g.rect(x - h + 7, y - h + 7, CELL - 14, CELL - 14).stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
      } else if (this.mapMode) {
        g.rect(x - h, y - h, CELL, CELL).stroke({ width: 1, color: 0xffffff, alpha: 0.22 });
      }
    }
    if (this.pickedCell) {
      const { x, y } = cellCenter(this.pickedCell.cx, this.pickedCell.cy);
      g.rect(x - CELL / 2, y - CELL / 2, CELL, CELL).stroke({ width: 5, color: 0xffd23a, alpha: 1 });
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

  focusPoint(x: number, y: number, zoom = 1.65) {
    this.moveCamera({ cx: x, cy: y, zoom });
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

  /** explorar un país: cámara cerca, halo con su nombre, y el resto de islas se atenúan para que cada zona tenga sentido. */
  focusCountry(code: string | null) {
    this.focusCode = code;
    if (code && this.selectedId) {
      this.selectedId = null;
      this.cb.onSelect(null);
      this.updateRings();
    }
    for (const n of this.nodes.values()) n.box.alpha = !code || n.data.country === code ? 1 : 0.28;
    this.drawFocus();
    if (code) {
      const p = countryAnchor(code);
      this.moveCamera({ cx: p.x, cy: p.y, zoom: 3.6 });
    }
    this.renderNow();
  }

  private drawFocus() {
    const g = this.focusHalo;
    g.clear();
    if (!this.focusCode) return;
    const p = countryAnchor(this.focusCode);
    const has = [...this.nodes.values()].some((n) => n.data.country === this.focusCode);
    g.circle(p.x, p.y, 130).fill({ color: 0xffffff, alpha: 0.1 }).stroke({ width: 3, color: 0xffffff, alpha: 0.75 });
    g.circle(p.x, p.y, 92).stroke({ width: 2, color: 0x7fe0ff, alpha: 0.6 });
    if (!has) {
      // tierra libre: nadie ha construido aquí todavía
      g.circle(p.x, p.y, 34).fill({ color: 0xbff4ff, alpha: 0.35 }).stroke({ width: 3, color: 0xffffff, alpha: 0.95 });
      g.circle(p.x - 9, p.y - 10, 7).fill({ color: 0xffffff, alpha: 0.9 });
    }
  }

  private buildLabels() {
    if (this.labelNodes.length) return;
    for (const c of COUNTRIES) {
      const p = countryAnchor(c.code);
      const text = new Text({ text: c.name, style: { fontFamily: 'system-ui, sans-serif', fontSize: 15, fontWeight: '800', fill: 0xffffff, stroke: { color: 0x0b4f86, width: 3 }, align: 'center' } });
      text.anchor.set(0.5, 0);
      text.position.set(p.x, p.y + 15);
      text.resolution = 2;
      this.countryLabels.addChild(text);
      this.labelNodes.push({ code: c.code, x: p.x, y: p.y, text });
    }
  }

  /** los nombres de países aparecen al acercarse y solo cerca del centro de la vista. */
  private updateLabels() {
    const z = this.cam.zoom;
    const on = z >= 1.7 && this.mapMode === false;
    this.countryLabels.visible = on;
    if (!on) return;
    this.buildLabels();
    const alpha = smooth(1.7, 2.6, z);
    const vp = this.vp();
    const reach = (Math.max(vp.width, vp.height) / (worldFit(vp) * z)) * 0.62;
    for (const l of this.labelNodes) {
      const near = Math.hypot(l.x - this.cam.cx, l.y - this.cam.cy) <= reach;
      l.text.visible = near;
      if (near) {
        const focus = l.code === this.focusCode;
        l.text.alpha = focus ? 1 : alpha;
        l.text.scale.set((focus ? 1.35 : 1) / Math.max(1, z * 0.7));
      }
    }
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
    const planetR = Math.min(w, h) * 0.4;

    this.far.position.set(cx, cy + (this.reduced ? 0 : Math.sin(this.time * 0.6) * 3));
    this.far.scale.set(1 + 5.2 * e);
    const farAlpha = 1 - smooth(0.5, 0.85, t);
    this.far.alpha = farAlpha;
    this.far.visible = t < 0.99;
    this.globe?.setPresence(farAlpha, this.target === 0 && t < 0.05);

    const finalR = Math.hypot(w, h) * 0.52;
    const maskR = lerp(planetR * 0.92, finalR, smooth(0, 1, t));
    this.mask.clear().circle(cx, cy, maskR).fill({ color: 0xffffff });
    this.interior.visible = t > 0.28;
    this.interior.alpha = smooth(0.28, 0.5, t);
    this.frame.position.set(cx, cy);
    this.frame.alpha = smooth(0.6, 1, t);

    this.updateLabels();
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
    this.accents.update(this.reduced ? 0 : this.time, Math.min(this.app.screen.width, this.app.screen.height) * 0.4, this.app.screen.width / 2, this.app.screen.height / 2);
    if (this.traffic && this.t > 0.2) this.traffic.update(this.reduced ? 0 : this.time);
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
      if (this.focusCode && !this.reduced) this.focusHalo.alpha = 0.75 + Math.sin(this.time * 2.4) * 0.25;
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
    this.listen(canvas, 'dblclick', (e: MouseEvent) => {
      if (this.t < 0.95) return;
      this.cam = zoomWorldAt(this.cam, this.vp(), this.local(e as unknown as PointerEvent), this.cam.zoom * 1.9);
      this.emitView();
      this.renderNow();
    });
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

  /* el planeta es una escena 3d aparte (Globe3D); aquí solo se delega */
  spinPlanet(dLon: number, dTilt = 0) {
    this.globe?.spin(dLon, dTilt * 57);
  }

  faceCountry(code: string) {
    this.globe?.faceCountry(code);
  }

  markCountry(code: string | null) {
    this.pinCode = code;
    this.globe?.mark(code);
  }

  private countryAt(p: { x: number; y: number }): string | null {
    const world = screenToWorld(p, this.cam, this.vp());
    const hitRadius = Math.max(34, 28 / (worldFit(this.vp()) * this.cam.zoom));
    let nearest: { code: string; distance: number } | null = null;
    for (const country of COUNTRIES) {
      const point = countryAnchor(country.code);
      const distance = Math.hypot(world.x - point.x, world.y - point.y);
      if (distance <= hitRadius && (!nearest || distance < nearest.distance)) nearest = { code: country.code, distance };
    }
    return nearest?.code ?? null;
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
    if (this.target === 0 && this.t < 0.05) return;
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
      this.app.canvas.style.cursor = this.target === 0 ? 'default' : this.islandAt(p) || this.countryAt(p) ? 'pointer' : 'grab';
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
    if (this.target === 0) return;
    if (d && !d.moved && this.t >= 0.95 && this.mapMode) {
      const w = screenToWorld(p, this.cam, this.vp());
      const cell = cellAt(w.x, w.y);
      if (cell) {
        this.pickedCell = cell;
        this.drawTerritory();
        this.cb.onCell?.(cell.cx, cell.cy);
        this.renderNow();
      }
      return;
    }
    if (d && !d.moved && this.t >= 0.95) {
      const id = this.islandAt(p);
      if (id) {
        this.selectedId = id;
        this.cb.onSelect(id);
        this.updateRings();
        this.emitView();
        this.renderNow();
        return;
      }
      const country = this.countryAt(p);
      if (country) {
        this.focusCountry(country);
        this.cb.onCountry(country);
      }
      else {
        this.selectedId = null;
        this.cb.onSelect(null);
        this.updateRings();
        this.emitView();
        this.renderNow();
      }
    }
  }
}
