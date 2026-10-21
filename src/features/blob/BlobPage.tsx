import { useCallback, useEffect, useRef, useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { randomAvatar, type AvatarSpec } from '../../avatar/model';
import { avatarStore } from '../../avatar/store';
import { sfx } from '../../audio/sfx';
import { lang, tr } from '../../i18n';
import { useSession } from '../../persistence/session';
import { BrandOrb } from '../../ui/Brand';
import { mulberry32 } from '../minigames/rng';
import { BattleResult, ProgressCard } from '../royale/BattleResult';
import { recordMatch, type Outcome } from '../royale/progress';
import { burst, newFx, stepFx, RoyaleArt } from '../royale/render';
import '../royale/royale.css';
import { drawBlob, drawBlobMinimap, powerInfo } from './render';
import { center, createMatch, hazeRadius, radiusOf, ranking, step, totalMass, ROUND_TIME, type BlobEvent, type BlobInit, type Input, type Match, type PowerKind } from './sim';

const NAMES = ['burbuja', 'delfín', 'nenúfar', 'cristal', 'medusa', 'brisa', 'coral', 'perla', 'aqua', 'bruma', 'nube', 'marea'];
const NAMES_EN = ['bubble', 'dolphin', 'lily', 'crystal', 'jelly', 'breeze', 'coral', 'pearl', 'aqua', 'mist', 'cloud', 'tide'];

interface Hud { mass: number; rank: number; alive: number; time: number; haze: number; power: PowerKind | null; board: Array<{ id: string; name: string; mass: number; me: boolean }>; dead: boolean; place: number; count: number; banner: string }

/** aero blob: royale al estilo agar. creces comiendo burbujas y células más pequeñas; la bruma cierra la arena. */
export function BlobPage() {
  const session = useSession();
  const [phase, setPhase] = useState<'menu' | 'play' | 'over'>('menu');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [help, setHelp] = useState(false);
  const [hud, setHud] = useState<Hud>({ mass: 30, rank: 12, alive: 12, time: ROUND_TIME, haze: 100, power: null, board: [], dead: false, place: 0, count: 3, banner: '' });
  const [feed, setFeed] = useState<Array<{ id: number; text: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);
  const stats = useRef({ powers: 0, maxMass: 0 });
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const meName = session.username ? `@${session.username}` : tr('tú', 'you');

  const finish = useCallback((m: Match) => {
    const me = m.players[0];
    const placement = me.placement || 1;
    setOutcome(
      recordMatch({
        mode: 'blob', placement, players: m.players.length, kills: 0, bestCombo: 0, powers: stats.current.powers, seconds: m.t,
        mass: Math.round(Math.max(stats.current.maxMass, totalMass(me))), ate: me.eaten, lowHpWin: false,
      }),
    );
    setPhase('over');
  }, []);

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const id = ++runId.current;
    const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    const rnd = mulberry32(seed ^ 0x51ed270b);
    const names = lang === 'en' ? NAMES_EN : NAMES;
    const inits: BlobInit[] = [{ id: 'me', name: meName, hue: 190, isBot: false }];
    const specs: Record<string, AvatarSpec | null> = { me: avatarStore.get() };
    for (let i = 0; i < 11; i++) {
      inits.push({ id: `b${i}`, name: names[i % names.length], hue: (i * 47 + 20) % 360, isBot: true });
      specs[`b${i}`] = randomAvatar(rnd);
    }
    const m = createMatch(seed, inits);
    const art = new RoyaleArt(seed);
    const fx = newFx();
    stats.current = { powers: 0, maxMass: 0 };
    const me = m.players[0];
    const pointer = { x: 0, y: 0, mouse: false };
    const stick = { active: false, id: -1, cx: 0, cy: 0, x: 0, y: 0 };
    const flags = { split: false, eject: false, power: false };
    const focus = { x: me.cells[0].x, y: me.cells[0].y };
    let zoomNow = 0.6;
    let countdown = 3.2;
    let last = performance.now();
    let acc = 0;
    let time = 0;
    let uiAt = 0;
    let raf = 0;
    let ended = false;
    let speedUp = 1;
    let feedId = 1;
    const feedLines: Array<{ id: number; text: string; at: number }> = [];
    const addFeed = (text: string) => {
      feedLines.push({ id: feedId++, text, at: performance.now() });
      if (feedLines.length > 5) feedLines.shift();
    };
    const nameOf = (pid: string) => m.players.find((p) => p.id === pid)?.name ?? '?';

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const held = new Set<string>();
    const MOVE = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'];
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (MOVE.includes(k) || [' ', 'e', 'q', 'r', 'shift'].includes(k)) e.preventDefault();
      if (MOVE.includes(k)) held.add(k);
      if (e.repeat) return;
      if (k === ' ') flags.split = true;
      if (k === 'r' || k === 'shift') flags.eject = true;
      if (k === 'e' || k === 'q') flags.power = true;
    };
    const ku = (e: KeyboardEvent) => held.delete(e.key.toLowerCase());
    const clearKeys = () => held.clear();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', clearKeys);
    const rect = () => canvas.getBoundingClientRect();
    const pm = (e: PointerEvent) => {
      const r = rect();
      if (e.pointerType === 'mouse') {
        pointer.mouse = true;
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        return;
      }
      if (stick.active && e.pointerId === stick.id) {
        const dx = e.clientX - r.left - stick.cx;
        const dy = e.clientY - r.top - stick.cy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 55);
        stick.x = (dx / len) * k;
        stick.y = (dy / len) * k;
        const knob = stickRef.current?.firstElementChild as HTMLElement | null;
        if (knob) knob.style.transform = `translate(${stick.x * 40}px, ${stick.y * 40}px)`;
      }
    };
    const pd = (e: PointerEvent) => {
      const r = rect();
      if (e.pointerType === 'mouse') return pm(e);
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < r.width * 0.5 && !stick.active) {
        stick.active = true;
        stick.id = e.pointerId;
        stick.cx = x;
        stick.cy = y;
        if (stickRef.current) {
          stickRef.current.style.display = 'block';
          stickRef.current.style.left = `${x - 55}px`;
          stickRef.current.style.top = `${y - 55}px`;
        }
      }
      canvas.setPointerCapture?.(e.pointerId);
    };
    const pu = (e: PointerEvent) => {
      if (e.pointerId === stick.id) {
        stick.active = false;
        stick.x = stick.y = 0;
        if (stickRef.current) stickRef.current.style.display = 'none';
      }
    };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', pu);
    const btn = (elId: string, key: 'split' | 'eject' | 'power') => {
      const el = document.getElementById(elId);
      const h = (e: Event) => { e.preventDefault(); flags[key] = true; };
      el?.addEventListener('pointerdown', h);
      return () => el?.removeEventListener('pointerdown', h);
    };
    const offs = [btn('blob-split', 'split'), btn('blob-eject', 'eject'), btn('blob-power', 'power')];

    const handle = (ev: BlobEvent) => {
      if (ev.type === 'eat') {
        burst(fx, ev.x, ev.y, 40, 14);
        if (ev.by === 'me') {
          fx.floats.push({ x: ev.x, y: ev.y - 30, text: `+${Math.round(ev.mass)}`, life: 1, color: '#d8ff90' });
          sfx.coin();
        }
        if (ev.victim === 'me') fx.shake = 12;
      } else if (ev.type === 'death') {
        addFeed(ev.killer ? `${nameOf(ev.killer)} ${tr('se comió a', 'ate')} ${nameOf(ev.id)}` : `${nameOf(ev.id)} ${tr('se perdió en la bruma', 'was lost in the haze')}`);
      } else if (ev.type === 'pickup' && ev.by === 'me') {
        stats.current.powers += 1;
        sfx.levelUp();
        const info = powerInfo[ev.kind];
        setHud((h) => ({ ...h, banner: `${tr(info.name[0], info.name[1])}: ${tr('pulsa E o el botón', 'press E or the button')}` }));
        window.setTimeout(() => setHud((h) => ({ ...h, banner: '' })), 2200);
      } else if (ev.type === 'power') {
        burst(fx, ev.x, ev.y, 200, 18);
        if (ev.by === 'me') sfx.levelUp();
      } else if (ev.type === 'pop') {
        burst(fx, ev.x, ev.y, 300, 22);
        if (ev.by === 'me') fx.shake = 8;
      } else if (ev.type === 'split' && ev.by === 'me') sfx.pop();
    };

    const readInput = (): Input => {
      const c = me.alive ? center(me) : { x: focus.x, y: focus.y };
      let tx = me.tx;
      let ty = me.ty;
      if (stick.active && (stick.x || stick.y)) {
        tx = c.x + stick.x * 900;
        ty = c.y + stick.y * 900;
      } else {
        const dx = (held.has('d') || held.has('arrowright') ? 1 : 0) - (held.has('a') || held.has('arrowleft') ? 1 : 0);
        const dy = (held.has('s') || held.has('arrowdown') ? 1 : 0) - (held.has('w') || held.has('arrowup') ? 1 : 0);
        if (dx || dy) {
          const len = Math.hypot(dx, dy);
          tx = c.x + (dx / len) * 900;
          ty = c.y + (dy / len) * 900;
        } else {
          // sin teclas: la célula se queda quieta
          tx = c.x;
          ty = c.y;
        }
      }
      const inp: Input = { tx, ty, split: flags.split && countdown <= 0, eject: flags.eject && countdown <= 0, power: flags.power && countdown <= 0 };
      flags.split = flags.eject = flags.power = false;
      return inp;
    };

    const frame = (now: number) => {
      if (id !== runId.current) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (countdown > 0) countdown -= dt;
      else if (!m.over) {
        acc += dt * speedUp;
        const input = readInput();
        let n = 0;
        while (acc >= 1 / 60 && n++ < 6 * speedUp) {
          for (const ev of step(m, 1 / 60, { me: input })) handle(ev);
          acc -= 1 / 60;
        }
      }
      stats.current.maxMass = Math.max(stats.current.maxMass, totalMass(me));
      stepFx(fx, dt);
      // cámara: sigue tu masa; si te comieron, al líder
      const target = me.alive ? me : ranking(m)[0] ?? me;
      const c = target.cells.length ? center(target) : focus;
      focus.x += (c.x - focus.x) * Math.min(1, dt * 7);
      focus.y += (c.y - focus.y) * Math.min(1, dt * 7);
      const mass = Math.max(30, totalMass(target));
      const wantZoom = Math.min(w, h) / (880 + Math.sqrt(mass) * 24);
      zoomNow += (wantZoom - zoomNow) * Math.min(1, dt * 3);
      drawBlob({ ctx, w, h, m, focus, zoom: zoomNow, art, fx, specs, me: 'me', time });
      const mini = miniRef.current;
      if (mini) drawBlobMinimap(mini.getContext('2d')!, mini.width, m, 'me');
      if (now - uiAt > 140) {
        uiAt = now;
        const order = ranking(m);
        setHud({
          mass: Math.round(totalMass(me)), rank: me.alive ? order.findIndex((p) => p.id === 'me') + 1 : 0, alive: order.length,
          time: Math.max(0, Math.ceil(ROUND_TIME - m.t)), haze: Math.round((hazeRadius(m.t) / 2400) * 100), power: me.power,
          board: order.slice(0, 6).map((p) => ({ id: p.id, name: p.name, mass: Math.round(totalMass(p)), me: p.id === 'me' })),
          dead: !me.alive, place: me.placement, count: Math.max(0, Math.ceil(countdown)), banner: '',
        });
        setFeed(feedLines.filter((f) => now - f.at < 5000).map(({ id: fid, text }) => ({ id: fid, text })));
      }
      if (m.over && !ended) {
        ended = true;
        window.setTimeout(() => id === runId.current && finish(m), 1100);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __blob?: Match; __blobSpeed?: (n: number) => void }).__blob = m;
    (window as unknown as { __blobSpeed?: (n: number) => void }).__blobSpeed = (n) => { speedUp = n; };

    return () => {
      runId.current++;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', clearKeys);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
      offs.forEach((o) => o());
    };
  }, [phase, meName, finish]);

  const start = () => {
    sfx.click();
    setOutcome(null);
    setFeed([]);
    setPhase('play');
  };

  if (phase === 'over' && outcome) return <BattleResult outcome={outcome} onAgain={start} onMenu={() => setPhase('menu')} />;

  if (phase === 'menu' || phase === 'over') {
    return (
      <main className="royale royale--menu">
        <div className="royale__card">
          <BrandOrb size={72} />
          <p className="royale__kicker">frutiger aero</p>
          <h1>aero blob</h1>
          <p className="royale__lead">{tr('eres una célula de cristal: come burbujas, crece, divídete para cazar y usa poderes. la bruma gris cierra la arena; gana quien termine con más masa.', 'you are a glass cell: eat bubbles, grow, split to hunt and use powers. the gray haze closes the arena; whoever ends with the most mass wins.')}</p>
          <div className="royale__actions">
            <button type="button" className="vista-button vista-button--primary" onClick={start}>{tr('jugar contra 11 bots', 'play vs 11 bots')}</button>
            <button type="button" className="vista-button" onClick={() => setHelp((v) => !v)} aria-expanded={help}>{tr('cómo se juega', 'how to play')}</button>
            <a className="landing__text-link" href={routeHref('inicio')}>{tr('volver', 'back')}</a>
          </div>
          {help && (
            <ul className="royale__help">
              <li><b>{tr('mover', 'move')}</b> {touch ? tr('joystick a la izquierda', 'left joystick') : tr('WASD o flechas', 'WASD or arrow keys')}</li>
              <li><b>{tr('dividirte', 'split')}</b> {touch ? tr('botón ÷', '÷ button') : tr('espacio: lanzas la mitad hacia delante; vuelven a unirse solas', 'space: throws half forward; the halves merge back on their own')}</li>
              <li><b>{tr('soltar masa', 'eject mass')}</b> {touch ? tr('botón •', '• button') : tr('R o Shift: lanzas una burbuja de masa', 'R or Shift: shoots a mass bubble')}</li>
              <li><b>{tr('poderes', 'powers')}</b> » {tr('impulso', 'dash')} · ◆ {tr('escudo', 'shield')} · ◎ {tr('imán', 'magnet')} · ✱ {tr('congelar', 'freeze')} · ✺ {tr('estallido', 'burst')} · ★ {tr('festín', 'feast')} — {touch ? tr('botón de poder', 'power button') : tr('recoge uno y pulsa E', 'pick one up and press E')}</li>
              <li><b>{tr('peligros', 'hazards')}</b> {tr('las medusas moradas rompen a las células grandes en pedazos; la bruma gris te quita masa', 'purple jellyfish split big cells into pieces; the gray haze eats your mass')}</li>
            </ul>
          )}
          <ProgressCard />
          <a className="landing__text-link" href="#/royale">{tr('probar otro modo: aero royale', 'try another mode: aero royale')}</a>
        </div>
      </main>
    );
  }

  const info = hud.power ? powerInfo[hud.power] : null;
  const mm = String(Math.floor(hud.time / 60));
  const ss = String(hud.time % 60).padStart(2, '0');
  return (
    <main className="royale royale--play" aria-label="aero blob">
      <canvas ref={canvasRef} className="royale__canvas" />
      <div className="royale__hud">
        <div className="royale__chips">
          <span><b>{hud.mass}</b> {tr('masa', 'mass')}</span>
          <span><b>#{hud.rank || '—'}</b> {tr('de', 'of')} {hud.alive}</span>
        </div>
        <div className="royale__zone">{hud.banner || `${mm}:${ss} · ${tr('arena', 'arena')} ${hud.haze}%`}</div>
        <canvas ref={miniRef} className="royale__mini" width={132} height={132} aria-hidden="true" />
        <ul className="blob__board" aria-label={tr('clasificación', 'leaderboard')}>
          {hud.board.map((b, i) => <li key={b.id} className={b.me ? 'is-me' : ''}><span>{i + 1}. {b.name}</span><b>{b.mass}</b></li>)}
        </ul>
        <ul className="royale__feed" aria-live="polite" style={{ top: 'auto', bottom: 'max(130px, 18vh)' }}>{feed.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
        {!hud.dead && (
          <div className="blob__power" style={{ ['--c' as string]: info?.color ?? '#ffffff' }}>
            <b>{info?.glyph ?? '·'}</b>
            <span>{info ? tr(info.name[0], info.name[1]) : tr('sin poder', 'no power')}</span>
          </div>
        )}
        {hud.count > 0 && <div className="royale__count" aria-live="assertive">{hud.count}</div>}
        {hud.dead && (
          <div className="royale__dead" role="status">
            <strong>{tr('te comieron', 'you were eaten')} · {tr('puesto', 'place')} {hud.place}</strong>
            <span>{tr('mirando la partida', 'spectating')}</span>
            <button type="button" className="vista-button" onClick={() => (window as unknown as { __blobSpeed?: (n: number) => void }).__blobSpeed?.(5)}>{tr('acelerar', 'fast forward')}</button>
          </div>
        )}
        <div ref={stickRef} className="royale__stick" aria-hidden="true"><i /></div>
        {touch && !hud.dead && (
          <div className="blob__buttons">
            <button id="blob-power" type="button" aria-label={tr('usar poder', 'use power')}>{info?.glyph ?? '·'}</button>
            <button id="blob-split" type="button" aria-label={tr('dividirse', 'split')}>÷</button>
            <button id="blob-eject" type="button" aria-label={tr('soltar masa', 'eject mass')}>•</button>
          </div>
        )}
        <button type="button" className="royale__exit vista-button" onClick={() => { runId.current++; setPhase('menu'); }}>{tr('salir', 'exit')}</button>
      </div>
    </main>
  );
}

export { radiusOf };
