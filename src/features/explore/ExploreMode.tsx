import { useEffect, useRef, useState } from 'react';
import { pencilSprite, loadImage } from '../../art/pencil';
import { avatarDataUrl } from '../../avatar/svg';
import type { AvatarSpec } from '../../avatar/model';
import { CATALOG_MAP } from '../../catalog/catalog';
import { CENTER, landRadii } from '../../domain/geometry';
import type { PlacedObject } from '../../domain/island';
import { dirOf, rightOf, startWalker, stepWalker, toCamera, type Walker } from './walker';
import './explore.css';
import { tr } from '../../i18n';

interface Props {
  objects: readonly PlacedObject[];
  level: number;
  avatar: AvatarSpec | null;
  onExit: () => void;
}

type View = 'primera' | 'tercera';
const SKY_TOP: [number, number, number] = [92, 170, 236];
const HAZE: [number, number, number] = [200, 236, 252];
const FOG_END = 1700;

/** tile de hierba/arena reutilizado al muestrear el suelo. */
function makeTile(): Uint8Array {
  const n = 128;
  const t = new Uint8Array(n * n);
  let s = 12345;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const base = new Float32Array(16 * 16).map(() => rnd());
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const fx = (x / n) * 16;
      const fy = (y / n) * 16;
      const x0 = Math.floor(fx) % 16;
      const y0 = Math.floor(fy) % 16;
      const x1 = (x0 + 1) % 16;
      const y1 = (y0 + 1) % 16;
      const tx = fx - Math.floor(fx);
      const ty = fy - Math.floor(fy);
      const a = base[y0 * 16 + x0] * (1 - tx) + base[y0 * 16 + x1] * tx;
      const b = base[y1 * 16 + x0] * (1 - tx) + base[y1 * 16 + x1] * tx;
      t[y * n + x] = Math.round((a * (1 - ty) + b * ty) * 255 * 0.7 + rnd() * 255 * 0.3);
    }
  return t;
}

/** exploración a pie: el jugador controla a su personaje en tercera o primera persona sobre su isla. */
export function ExploreMode({ objects, level, avatar, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>('tercera');
  const viewRef = useRef<View>('tercera');
  viewRef.current = view;
  const exitRef = useRef(onExit);
  exitRef.current = onExit;
  const stick = useRef({ x: 0, y: 0 });
  const [hint, setHint] = useState(true);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tile = makeTile();
    const radii = landRadii(level);
    const buf = document.createElement('canvas');
    const bctx = buf.getContext('2d')!;
    let walker: Walker = startWalker(objects, CATALOG_MAP, level);
    let alive = true;
    let raf = 0;
    let last = performance.now();
    let time = 0;
    let walkPhase = 0;
    let moving = 0;
    let faceFlip = 1;
    let W = 0;
    let H = 0;
    const keys = new Set<string>();
    const sprites = new Map<string, HTMLCanvasElement>();
    let avatarImg: HTMLCanvasElement | null = null;

    const ids = [...new Set(objects.map((o) => o.assetId))];
    ids.forEach((id) => {
      const item = CATALOG_MAP.get(id);
      if (item) void pencilSprite(item.assetPath).then((c) => alive && sprites.set(id, c)).catch(() => undefined);
    });
    if (avatar) {
      void loadImage(avatarDataUrl(avatar, 'completo')).then((img) => {
        if (!alive) return;
        const c = document.createElement('canvas');
        c.width = 192;
        c.height = 320;
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        avatarImg = c;
      }).catch(() => undefined);
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buf.width = Math.max(160, Math.round(W / 3));
      buf.height = Math.max(90, Math.round(H / 3));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitRef.current();
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        setView((v) => (v === 'primera' ? 'tercera' : 'primera'));
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keys.add(e.key.toLowerCase());
      setHint(false);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let look: { x: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      look = { x: e.clientX, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!look || look.id !== e.pointerId) return;
      walker = { ...walker, heading: walker.heading + (e.clientX - look.x) * 0.006 };
      look.x = e.clientX;
    };
    const onUp = () => {
      look = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const eyeFirst = 118;
    const eyeThird = 170;
    const camBack = 350;

    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      // entrada
      const k = (n: string) => (keys.has(n) ? 1 : 0);
      const forward = k('w') + k('arrowup') - k('s') - k('arrowdown') - stick.current.y;
      const strafe = k('d') - k('a') + stick.current.x;
      const turn = k('e') - k('q') + k('arrowright') * 0 - k('arrowleft') * 0;
      const turnArrows = k('arrowright') - k('arrowleft');
      const next = stepWalker(walker, { forward: Math.max(-1, Math.min(1, forward)), strafe: Math.max(-1, Math.min(1, strafe)), turn: turn + turnArrows }, dt, objects, CATALOG_MAP, level);
      const moved = Math.hypot(next.x - walker.x, next.y - walker.y) > 0.05;
      walker = next;
      moving += ((moved ? 1 : 0) - moving) * Math.min(1, dt * 10);
      if (moved) walkPhase += dt * 9;
      if (strafe !== 0) faceFlip = strafe > 0 ? 1 : -1;

      const first = viewRef.current === 'primera';
      const d = dirOf(walker.heading);
      const bob = reduced ? 0 : Math.sin(walkPhase) * 3.5 * moving;
      const camH = (first ? eyeFirst : eyeThird) + (first ? bob : 0);
      const cam = first ? { x: walker.x, y: walker.y, heading: walker.heading } : { x: walker.x - d.x * camBack, y: walker.y - d.y * camBack, heading: walker.heading };
      const f = H * 0.95;
      const hy = H * (first ? 0.44 : 0.42);

      // cielo
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, `rgb(${SKY_TOP})`);
      sky.addColorStop(1, `rgb(${HAZE})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hy + 2);
      // nubes (parallax con el giro)
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 7; i++) {
        const ang = i * 0.9 + 0.4;
        let dx = (((ang - walker.heading) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        dx += reduced ? 0 : Math.sin(time * 0.05 + i) * 0.02;
        if (Math.abs(dx) > 0.9) continue;
        const cx = W / 2 + dx * f * 1.05;
        const cy = hy * (0.2 + (i % 3) * 0.2);
        for (const [ox, oy, r] of [[0, 0, 26], [28, 6, 20], [-28, 8, 18], [8, -10, 18]] as const) {
          ctx.beginPath();
          ctx.arc(cx + ox * (W / 900 + 0.5), cy + oy, r * (W / 900 + 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // colinas lejanas
      ctx.fillStyle = 'rgba(120,190,170,.55)';
      ctx.beginPath();
      ctx.moveTo(0, hy);
      for (let x = 0; x <= W; x += 24) ctx.lineTo(x, hy - 10 - Math.sin((x / W) * 5 + walker.heading * 3) * 7 - Math.sin(x * 0.03 + walker.heading * 9) * 3);
      ctx.lineTo(W, hy);
      ctx.fill();

      // suelo (modo 7 en un buffer pequeño)
      const bw = buf.width;
      const bh = buf.height;
      const bhy = (hy / H) * bh;
      const bf = (f / H) * bh;
      const img = bctx.createImageData(bw, bh);
      const px = img.data;
      const r = rightOf(walker.heading);
      const dd = dirOf(walker.heading);
      for (let y = Math.max(0, Math.floor(bhy) + 1); y < bh; y++) {
        const dist = (camH * bf) / (y - bhy);
        const fog = Math.min(1, dist / FOG_END);
        const stepL = dist / bf;
        let wx = cam.x + dd.x * dist - r.x * stepL * (bw / 2);
        let wy = cam.y + dd.y * dist - r.y * stepL * (bw / 2);
        const sx = r.x * stepL;
        const sy = r.y * stepL;
        for (let x = 0; x < bw; x++, wx += sx, wy += sy) {
          const ex = (wx - CENTER.x) / radii.rx;
          const ey = (wy - CENTER.y) / radii.ry;
          const e = ex * ex + ey * ey;
          const n = tile[(((wy * 0.35) | 0) & 127) * 128 + (((wx * 0.35) | 0) & 127)] / 255;
          let cr: number, cg: number, cb: number;
          if (e <= 1) {
            const edge = Math.max(0, (e - 0.82) / 0.18);
            cr = 92 + n * 70 - edge * 26;
            cg = 168 + n * 50 - edge * 20;
            cb = 62 + n * 30 - edge * 14;
          } else if (e <= 1.32) {
            cr = 238 - n * 24;
            cg = 218 - n * 26;
            cb = 164 - n * 24;
          } else {
            const rip = reduced ? 0 : Math.sin(wx * 0.05 + time * 1.4) * Math.sin(wy * 0.045 - time * 1.1);
            const foam = e < 1.5 ? (1.5 - e) * 1.2 : 0;
            cr = 40 + n * 20 + rip * 14 + foam * 150;
            cg = 140 + n * 22 + rip * 18 + foam * 100;
            cb = 210 + n * 16 + rip * 16 + foam * 40;
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
      ctx.drawImage(buf, 0, 0, bw, bh, 0, 0, W, H);

      // billboards ordenados de lejos a cerca
      type Draw = { depth: number; draw: () => void };
      const draws: Draw[] = [];
      const addBillboard = (img2: HTMLCanvasElement | undefined, wx: number, wy: number, worldH: number, ratio: number, flip: number, lift = 0, alpha = 1) => {
        if (!img2) return;
        const { depth, lateral } = toCamera(wx, wy, cam);
        if (depth < 30 || depth > FOG_END) return;
        const sc = f / depth;
        const hpx = worldH * sc;
        const wpx = hpx * ratio;
        const sxp = W / 2 + lateral * sc;
        if (sxp + wpx < -40 || sxp - wpx > W + 40) return;
        const syp = hy + (camH + lift) * sc;
        draws.push({
          depth,
          draw: () => {
            const fog = Math.min(1, depth / FOG_END);
            ctx.save();
            ctx.globalAlpha = alpha * (1 - fog * 0.55);
            ctx.translate(sxp, syp);
            ctx.scale(flip, 1);
            // sombra
            ctx.fillStyle = 'rgba(20,50,30,.22)';
            ctx.beginPath();
            ctx.ellipse(0, 0, wpx * 0.32, Math.max(2, hpx * 0.05), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.drawImage(img2, -wpx / 2, -hpx, wpx, hpx);
            ctx.restore();
          },
        });
      };
      for (const o of objects) {
        const item = CATALOG_MAP.get(o.assetId);
        if (!item) continue;
        const water = item.placementZone === 'water';
        const lift = water ? -Math.sin(time * 1.6 + o.x) * 3 : 0;
        const ar = 1;
        addBillboard(sprites.get(o.assetId), o.x, o.y, item.spriteSize * o.scale * 0.95, ar, o.rotation % 2 ? -1 : 1, lift);
      }
      if (!first && avatarImg) addBillboard(avatarImg, walker.x, walker.y, 150, 0.6, faceFlip, reduced ? 0 : Math.abs(Math.sin(walkPhase)) * 5 * moving);
      draws.sort((a, b) => b.depth - a.depth).forEach((dr) => dr.draw());

      // minimapa
      const mm = 104;
      const mx = W - mm - 14;
      const my = 14;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx + mm / 2, my + mm / 2, mm / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.clip();
      const ms = mm / Math.max(760, radii.rx * 2 * 1.08);
      ctx.fillStyle = '#7cc84a';
      ctx.beginPath();
      ctx.ellipse(mx + mm / 2, my + mm / 2, radii.rx * ms, radii.ry * ms, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f7a28';
      for (const o of objects) ctx.fillRect(mx + mm / 2 + (o.x - CENTER.x) * ms - 1.5, my + mm / 2 + (o.y - CENTER.y) * ms - 1.5, 3, 3);
      const pxm = mx + mm / 2 + (walker.x - CENTER.x) * ms;
      const pym = my + mm / 2 + (walker.y - CENTER.y) * ms;
      ctx.translate(pxm, pym);
      ctx.rotate(walker.heading);
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

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [objects, level, avatar]);

  const padRef = useRef<HTMLDivElement>(null);
  const setStick = (e: React.PointerEvent) => {
    const el = padRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    const m = Math.hypot(x, y) || 1;
    const c = Math.min(1, m);
    stick.current = { x: (x / m) * c, y: (y / m) * c };
    setHint(false);
  };

  return (
    <div className="explore" role="application" aria-label={tr('exploración a pie', 'exploring on foot')}>
      <canvas ref={canvasRef} className="explore__canvas" />
      <div className="explore__bar">
        <strong>{view === 'primera' ? tr('primera persona', 'first person') : tr('tercera persona', 'third person')}</strong>
        <button type="button" onClick={() => setView((v) => (v === 'primera' ? 'tercera' : 'primera'))}>{tr('cambiar vista', 'change view')}</button>
        <button type="button" onClick={onExit}>{tr('salir', 'exit')}</button>
      </div>
      {hint && <p className="explore__hint">{touch ? tr('usa la palanca para caminar y arrastra para mirar', 'use the stick to walk and drag to look around') : tr('w a s d para caminar · q e o flechas para girar · arrastra para mirar · v cambia la vista · esc sale', 'w a s d to walk · q e or arrows to turn · drag to look · v changes the view · esc exits')}</p>}
      <div
        ref={padRef}
        className="explore__pad"
        aria-label={tr('palanca de movimiento', 'movement stick')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setStick(e);
        }}
        onPointerMove={(e) => e.buttons && setStick(e)}
        onPointerUp={() => (stick.current = { x: 0, y: 0 })}
        onPointerCancel={() => (stick.current = { x: 0, y: 0 })}
      >
        <i />
      </div>
    </div>
  );
}
