/** planeta 3d: esfera con el mapa del juego, atmósfera, nubes, luna, satélite y anillo de burbujas. se gira, se acerca y se pueden elegir países. */
import {
  AmbientLight,
  BackSide,
  CanvasTexture,
  Color,
  DirectionalLight,
  Euler,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
  ShaderMaterial,
} from 'three';
import { isLand, renderCloudMap, renderPlanetMap } from '../art/planet';
import { COUNTRIES } from '../world/countries';

export interface GlobeCallbacks {
  onCountry(code: string): void;
  onEnter(): void;
}

const D2R = Math.PI / 180;
const FOV = 30;
const RING_TILT = new Euler(0.38, 0, -0.26);
const vec = (lon: number, lat: number) => new Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R));

export class Globe3D {
  readonly canvas: HTMLCanvasElement;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(FOV, 1, 0.1, 50);
  private root = new Group();
  private planet: Mesh;
  private clouds: Mesh;
  private pin = new Group();
  private damageCanvas = document.createElement('canvas');
  private damageTex: CanvasTexture | null = null;
  private pinCode: string | null = null;
  private moon: Mesh;
  private sat = new Group();
  private ringBubbles: Mesh[] = [];
  private raycaster = new Raycaster();
  private lon = -38;
  private lat = 20;
  private vLon = 0;
  private vLat = 0;
  private zoom = 1;
  private baseDistance = 4;
  private px = 0.8;
  private w = 1;
  private h = 1;
  private time = 0;
  private drag: { x: number; y: number; lon: number; lat: number; moved: boolean; id: number } | null = null;
  private tween: { fromLon: number; toLon: number; fromLat: number; toLat: number; t: number } | null = null;
  private pinch: { dist: number; zoom: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private idleSince = 0;
  private lastFrame = 0;
  private raf = 0;
  private running = false;
  private disposers: Array<() => void> = [];
  enabled = true;
  reduced = false;

  constructor(host: HTMLElement, private cb: GlobeCallbacks) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab', display: 'block' });
    host.appendChild(this.canvas);

    const map = new CanvasTexture(renderPlanetMap());
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    this.planet = new Mesh(new SphereGeometry(1, 96, 64), new MeshLambertMaterial({ map }));
    const cloudTex = new CanvasTexture(renderCloudMap());
    cloudTex.colorSpace = SRGBColorSpace;
    this.clouds = new Mesh(new SphereGeometry(1.018, 64, 48), new MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.42, depthWrite: false }));
    this.damageCanvas.width = 1024;
    this.damageCanvas.height = 512;
    this.damageTex = new CanvasTexture(this.damageCanvas);
    this.damageTex.colorSpace = SRGBColorSpace;
    const damage = new Mesh(new SphereGeometry(1.007, 64, 48), new MeshBasicMaterial({ map: this.damageTex, transparent: true, depthWrite: false }));
    this.root.add(this.planet, damage, this.clouds, this.pin);
    this.scene.add(this.root);

    const atmo = new Mesh(
      new SphereGeometry(1.14, 64, 48),
      new ShaderMaterial({
        transparent: true,
        premultipliedAlpha: true,
        side: BackSide,
        depthWrite: false,
        uniforms: { c: { value: new Color(0x7fd6ff) } },
        vertexShader: 'varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'varying vec3 n; uniform vec3 c; void main(){ float i = clamp(pow(0.74 - dot(n, vec3(0.0,0.0,1.0)), 2.4) * 1.1, 0.0, 0.6); gl_FragColor = vec4(c * i, i); }',
      }),
    );
    this.scene.add(atmo);

    const sun = new DirectionalLight(0xfff4dc, 2.2);
    sun.position.set(-3, 2.6, 4);
    this.scene.add(sun, new AmbientLight(0xbfe4ff, 1.15));

    // pin del país elegido
    const dot = new Mesh(new SphereGeometry(0.022, 16, 12), new MeshBasicMaterial({ color: 0xffd23a }));
    const ring = new Mesh(new RingGeometry(0.035, 0.05, 40), new MeshBasicMaterial({ color: 0xffffff, side: 2, transparent: true, opacity: 0.9 }));
    ring.position.z = 0.0;
    this.pin.add(dot, ring);
    this.pin.visible = false;

    // luna, satélite, anillo de burbujas (3d real)
    this.moon = new Mesh(new SphereGeometry(0.17, 40, 30), new MeshLambertMaterial({ color: 0xe6eef8 }));
    for (const [x, y, s] of [[0.08, 0.05, 0.05], [-0.07, 0.09, 0.035], [0.02, -0.1, 0.04]] as const) {
      const cr = new Mesh(new SphereGeometry(s, 16, 12), new MeshLambertMaterial({ color: 0xb4c6dc }));
      cr.position.set(x, y, Math.sqrt(Math.max(0, 0.17 * 0.17 - x * x - y * y)) * 0.98);
      this.moon.add(cr);
    }
    this.scene.add(this.moon);
    const body = new Mesh(new BoxGeometry(0.06, 0.06, 0.06), new MeshLambertMaterial({ color: 0xeaf8ff }));
    const panelMat = new MeshLambertMaterial({ color: 0x2a78c8 });
    const pl = new Mesh(new BoxGeometry(0.12, 0.004, 0.06), panelMat);
    const pr = pl.clone();
    pl.position.x = -0.1;
    pr.position.x = 0.1;
    this.sat.add(body, pl, pr);
    this.scene.add(this.sat);
    const bubbleMat = new MeshLambertMaterial({ color: 0xe8f9ff, emissive: 0x3a9ad0, transparent: true, opacity: 0.62 });
    for (let i = 0; i < 18; i++) {
      const b = new Mesh(new SphereGeometry(0.035, 20, 14), bubbleMat);
      this.ringBubbles.push(b);
      this.scene.add(b);
    }
    this.bind();
  }

  /* ---------- API ---------- */

  resize(w: number, h: number, planetPx: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.px = planetPx / 2;
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    // distancia a la que la esfera unidad mide `planetPx / 2` píxeles de radio
    const t = (this.px / (this.h / 2)) * Math.tan((FOV * D2R) / 2);
    this.baseDistance = Math.sqrt(1 + 1 / (t * t));
    this.applyCamera();
    this.render();
  }

  setReducedMotion(v: boolean) {
    this.reduced = v;
  }

  setActive(v: boolean) {
    if (v === this.running) return;
    this.running = v;
    cancelAnimationFrame(this.raf);
    if (v) {
      this.lastFrame = performance.now();
      this.loop();
    }
  }

  /** opacidad del lienzo y si recibe entradas. */
  setPresence(alpha: number, interactive: boolean) {
    this.canvas.style.opacity = String(alpha);
    this.canvas.style.pointerEvents = interactive ? 'auto' : 'none';
    this.canvas.style.visibility = alpha < 0.01 ? 'hidden' : 'visible';
    this.setActive(alpha >= 0.01);
  }

  spin(dLon: number, dLat = 0) {
    this.tween = null;
    this.lon += dLon;
    this.lat = Math.max(-80, Math.min(80, this.lat + dLat));
    this.idleSince = this.time;
  }

  faceCountry(code: string) {
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) return;
    let to = c.lon;
    while (to - this.lon > 180) to -= 360;
    while (to - this.lon < -180) to += 360;
    this.tween = { fromLon: this.lon, toLon: to, fromLat: this.lat, toLat: Math.max(-60, Math.min(60, c.lat)), t: this.reduced ? 1 : 0 };
    this.vLon = this.vLat = 0;
  }

  /** parches grises sobre las regiones dañadas (lon, lat en grados; damage 0..1). */
  setDamage(points: ReadonlyArray<{ lon: number; lat: number; damage: number }>) {
    const ctx = this.damageCanvas.getContext('2d');
    if (!ctx || !this.damageTex) return;
    const w = this.damageCanvas.width;
    const h = this.damageCanvas.height;
    ctx.clearRect(0, 0, w, h);
    for (const p of points) {
      if (p.damage <= 0.02) continue;
      const x = ((p.lon + 180) / 360) * w;
      const y = ((90 - p.lat) / 180) * h;
      const r = (15 / Math.max(0.35, Math.cos((p.lat * Math.PI) / 180))) * 0.8 + 6;
      for (const dx of [0, -w, w]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, `rgba(96,102,108,${0.78 * p.damage})`);
        g.addColorStop(1, 'rgba(96,102,108,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
    this.damageTex.needsUpdate = true;
  }

  /** el planeta ya no se tiñe entero: solo se marcan las zonas dañadas (ver setDamage). */
  setRestoration(_fraction: number) {
    void _fraction;
  }

  mark(code: string | null) {
    this.pinCode = code;
    const c = COUNTRIES.find((x) => x.code === code);
    if (!c) {
      this.pin.visible = false;
      return;
    }
    const p = vec(c.lon, c.lat);
    this.pin.position.copy(p.clone().multiplyScalar(1.012));
    this.pin.lookAt(p.clone().multiplyScalar(3));
    this.pin.visible = true;
  }

  get markedCode() {
    return this.pinCode;
  }

  destroy() {
    this.setActive(false);
    this.disposers.forEach((d) => d());
    this.renderer.dispose();
    this.canvas.remove();
  }

  /* ---------- interno ---------- */

  private applyCamera() {
    const d = this.baseDistance / this.zoom;
    this.camera.position.set(0, 0, d);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  private orient() {
    const p = vec(this.lon, 0);
    this.root.rotation.order = 'XYZ';
    this.root.rotation.y = -Math.atan2(p.x, p.z);
    this.root.rotation.x = this.lat * D2R;
    this.root.updateMatrixWorld(true);
  }

  private loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.step(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private step(dt: number) {
    this.time += dt;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / 0.9);
      const k = tw.t * tw.t * (3 - 2 * tw.t);
      this.lon = tw.fromLon + (tw.toLon - tw.fromLon) * k;
      this.lat = tw.fromLat + (tw.toLat - tw.fromLat) * k;
      if (tw.t >= 1) this.tween = null;
    } else if (!this.drag) {
      this.lon += this.vLon * dt;
      this.lat = Math.max(-80, Math.min(80, this.lat + this.vLat * dt));
      const damp = Math.exp(-dt * 3.2);
      this.vLon *= damp;
      this.vLat *= damp;
      if (!this.reduced && this.time - this.idleSince > 4 && Math.abs(this.vLon) < 1) this.lon += dt * 2.2; // giro lento en reposo
    }
    this.orient();
    this.clouds.rotation.y += this.reduced ? 0 : dt * 0.012;
    // órbitas (en el espacio de la escena, no giran con el planeta)
    const a = this.reduced ? 0.6 : this.time * 0.14;
    this.moon.position.set(Math.cos(a) * 1.75, 0.45 + Math.sin(a) * 0.1, Math.sin(a) * 1.75);
    const b = this.reduced ? 2 : this.time * 0.33 + 2;
    this.sat.position.set(Math.cos(b) * 1.32, Math.sin(b) * 0.7, Math.sin(b) * 0.9);
    this.sat.rotation.set(0.2, b, 0.1);
    this.ringBubbles.forEach((m, i) => {
      const t = (i / this.ringBubbles.length) * Math.PI * 2 + (this.reduced ? 0 : this.time * 0.07);
      m.position.set(Math.cos(t) * 1.45, Math.sin(t * 2) * 0.015, Math.sin(t) * 1.45).applyEuler(RING_TILT);
    });
    if (this.pin.visible) {
      const k = this.reduced ? 1 : 1 + Math.sin(this.time * 3) * 0.18;
      this.pin.scale.setScalar(k);
    }
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  private ndc(e: { clientX: number; clientY: number }) {
    const r = this.canvas.getBoundingClientRect();
    return new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private pick(e: { clientX: number; clientY: number }): { hit: boolean; code: string | null } {
    this.orient();
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hit = this.raycaster.intersectObject(this.planet, false)[0];
    if (!hit) return { hit: false, code: null };
    const local = this.planet.worldToLocal(hit.point.clone()).normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, local.y)));
    const lon = Math.atan2(-local.z, local.x);
    const land = isLand(lon / D2R, lat / D2R);
    const reach = land ? 0.3 : 0.07;
    let best: { code: string; d: number } | null = null;
    for (const c of COUNTRIES) {
      const la = c.lat * D2R;
      const lo = c.lon * D2R;
      const d = Math.acos(Math.max(-1, Math.min(1, Math.sin(lat) * Math.sin(la) + Math.cos(lat) * Math.cos(la) * Math.cos(lon - lo))));
      if (d < reach && (!best || d < best.d)) best = { code: c.code, d };
    }
    return { hit: true, code: best?.code ?? null };
  }

  private on<K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) {
    this.canvas.addEventListener(type, fn as EventListener, opts);
    this.disposers.push(() => this.canvas.removeEventListener(type, fn as EventListener, opts));
  }

  private bind() {
    this.on('pointerdown', (e) => {
      this.canvas.setPointerCapture?.(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: this.zoom };
        this.drag = null;
        return;
      }
      this.tween = null;
      this.drag = { x: e.clientX, y: e.clientY, lon: this.lon, lat: this.lat, moved: false, id: e.pointerId };
      this.vLon = this.vLat = 0;
    });
    this.on('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) {
        const { hit, code } = this.pick(e);
        this.canvas.style.cursor = code ? 'pointer' : hit ? 'grab' : 'default';
        return;
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        this.zoom = Math.max(0.75, Math.min(2.4, this.pinch.zoom * ((Math.hypot(a.x - b.x, a.y - b.y) || 1) / this.pinch.dist)));
        this.applyCamera();
        return;
      }
      const d = this.drag;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
      d.moved = true;
      this.canvas.style.cursor = 'grabbing';
      const k = 57 / (this.px * this.zoom);
      const nLon = d.lon - (e.clientX - d.x) * k;
      const nLat = Math.max(-80, Math.min(80, d.lat + (e.clientY - d.y) * k));
      this.vLon = (nLon - this.lon) * 14;
      this.vLat = (nLat - this.lat) * 14;
      this.lon = nLon;
      this.lat = nLat;
      this.idleSince = this.time;
    });
    const end = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId)) return;
      if (this.pinch) {
        if (this.pointers.size < 2) this.pinch = null;
        return;
      }
      const d = this.drag;
      this.drag = null;
      if (d && !d.moved && e.type === 'pointerup') {
        const { hit, code } = this.pick(e);
        if (code) this.cb.onCountry(code);
        else if (hit) this.cb.onEnter();
      }
    };
    this.on('pointerup', end);
    this.on('pointercancel', (e) => {
      this.pointers.delete(e.pointerId);
      this.drag = null;
      this.pinch = null;
    });
    this.on(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom = Math.max(0.75, Math.min(2.4, this.zoom * Math.exp(-e.deltaY * 0.0012)));
        this.applyCamera();
      },
      { passive: false },
    );
    this.on('dblclick', () => {
      this.zoom = 1;
      this.applyCamera();
    });
  }
}
