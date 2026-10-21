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
import { cleanCode, netAvailable, newRoomCode, packState, RoyaleNet, type Member, type PbMsg, type StateMsg } from './net';
import { drawRadar, drawScene, drawWeapon, newFx, PbArt, type Fx, type View } from './render';
import { MAX_AMMO, MAX_HP, RELOAD_TIME, applyZone, createMatch, eliminate, registerHit, step, takeHits, zoneAt, type Input, type Match, type PlayerInit } from './sim';
import './paintball.css';
import '../royale/royale.css';

const TOTAL = 8;
const BOT_NAMES = ['burbuja', 'delfín', 'nenúfar', 'cristal', 'medusa', 'brisa', 'coral', 'perla'];
const BOT_NAMES_EN = ['bubble', 'dolphin', 'lily', 'crystal', 'jelly', 'breeze', 'coral', 'pearl'];
interface Feed { id: number; text: string; at: number }
interface Cfg { seed: number; inits: PlayerInit[]; specs: Record<string, AvatarSpec | null>; online: boolean; isHost: boolean }

/** paintball royale: primera persona, ocho jugadores, una zona que se cierra y la última isla en pie. */
export function PaintballPage() {
  const session = useSession();
  const [phase, setPhase] = useState<'menu' | 'lobby' | 'play' | 'over'>('menu');
  const [members, setMembers] = useState<Member[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [lobbyMsg, setLobbyMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [help, setHelp] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [hud, setHud] = useState({ alive: TOTAL, kills: 0, hp: MAX_HP, ammo: MAX_AMMO, reload: 0, zone: '', count: 3, dead: false, place: 0, locked: true, spectating: '' });
  const [feed, setFeed] = useState<Feed[]>([]);
  const netRef = useRef<RoyaleNet<PbMsg> | null>(null);
  const msgRef = useRef<(m: PbMsg) => void>(() => undefined);
  const membersRef = useRef<(l: Member[]) => void>(() => undefined);
  const cfgRef = useRef<Cfg | null>(null);
  const meId = useRef(`u${Math.random().toString(36).slice(2, 8)}`);
  const runId = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const meName = session.username ? `@${session.username}` : tr('tú', 'you');

  const finish = useCallback((m: Match, myId: string) => {
    const me = m.players.find((p) => p.id === myId)!;
    const placement = me.placement || 1;
    const result = recordMatch({ mode: 'paintball', placement, players: m.players.length, kills: me.kills, bestCombo: 0, powers: 0, seconds: m.t, mass: 0, ate: 0, lowHpWin: placement === 1 && me.hp <= 1 });
    setOutcome(result);
    void netRef.current?.close();
    netRef.current = null;
    setPhase('over');
  }, []);

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const id = ++runId.current;
    const cfg = cfgRef.current!;
    const { seed, inits, specs, online, isHost } = cfg;
    const myId = online ? meId.current : 'me';
    const net = netRef.current;
    const m = createMatch(seed, inits);
    const me = m.players.find((p) => p.id === myId)!;
    const art = new PbArt();
    void art.load([...new Set(m.obstacles.map((o) => o.kind))]);
    for (const p of m.players) void art.setAvatar(p.id, specs[p.id] ?? randomAvatar(mulberry32(seed + p.hue)));
    const fx: Fx = newFx();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const keys = new Set<string>();
    const targets = new Map<string, { x: number; y: number; h: number }>();
    const feedLines: Feed[] = [];
    let feedId = 1;
    let fireHeld = false;
    let reloadReq = false;
    let lookDx = 0;
    let moving = 0;
    let walkPhase = 0;
    let countdown = 3.4;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let time = 0;
    let uiAt = 0;
    let netAt = 0;
    let ended = false;
    let spectate: string | null = null;
    const stick = { id: -1, cx: 0, cy: 0, x: 0, y: 0 };
    const look = { id: -1, x: 0 };
    const nameOf = (pid: string) => (pid === 'zona' ? tr('la opacidad', 'the haze') : m.players.find((p) => p.id === pid)?.name ?? '?');
    const addFeed = (text: string) => {
      feedLines.push({ id: feedId++, text, at: performance.now() });
      if (feedLines.length > 5) feedLines.shift();
    };
    const owns = (p: { id: string; isBot: boolean }) => p.id === myId || (p.isBot && (!online || isHost));
    const send = (msg: PbMsg) => {
      if (online) net?.send(msg);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ---------- entrada ---------- */
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'r'].includes(k)) e.preventDefault();
      if (k === 'r') reloadReq = true;
      if (k === ' ') fireHeld = true;
      keys.add(k);
    };
    const ku = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === ' ') fireHeld = false;
      keys.delete(k);
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const locked = () => document.pointerLockElement === canvas;
    const onMouseMove = (e: MouseEvent) => {
      if (locked()) lookDx += e.movementX;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!locked() && !touch) {
        void canvas.requestPointerLock?.();
        return;
      }
      fireHeld = true;
    };
    const onMouseUp = () => {
      fireHeld = false;
    };
    document.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
    };
    const pd = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const p = pos(e);
      if (p.x < p.w * 0.5 && stick.id < 0) {
        stick.id = e.pointerId;
        stick.cx = p.x;
        stick.cy = p.y;
        stick.x = 0;
        stick.y = 0;
      } else if (p.x >= p.w * 0.5 && look.id < 0) {
        look.id = e.pointerId;
        look.x = p.x;
      }
      canvas.setPointerCapture?.(e.pointerId);
    };
    const pm = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const p = pos(e);
      if (e.pointerId === stick.id) {
        const dx = p.x - stick.cx;
        const dy = p.y - stick.cy;
        const mag = Math.min(1, Math.hypot(dx, dy) / 46);
        const a = Math.atan2(dy, dx);
        stick.x = Math.cos(a) * mag;
        stick.y = Math.sin(a) * mag;
        const el = stickRef.current;
        if (el) {
          el.style.display = 'block';
          el.style.left = `${stick.cx - 55}px`;
          el.style.top = `${stick.cy - 55}px`;
          (el.firstElementChild as HTMLElement | null)?.style.setProperty('transform', `translate(${stick.x * 34}px, ${stick.y * 34}px)`);
        }
      } else if (e.pointerId === look.id) {
        lookDx += (p.x - look.x) * 1.5;
        look.x = p.x;
      }
    };
    const pu = (e: PointerEvent) => {
      if (e.pointerId === stick.id) {
        stick.id = -1;
        stick.x = 0;
        stick.y = 0;
        if (stickRef.current) stickRef.current.style.display = 'none';
      }
      if (e.pointerId === look.id) look.id = -1;
    };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', pu);
    const fireBtn = document.getElementById('pb-fire');
    const reloadBtn = document.getElementById('pb-reload');
    const fd = (e: Event) => {
      e.preventDefault();
      fireHeld = true;
    };
    const fu = () => {
      fireHeld = false;
    };
    const rd = (e: Event) => {
      e.preventDefault();
      reloadReq = true;
    };
    fireBtn?.addEventListener('pointerdown', fd);
    window.addEventListener('pointerup', fu);
    reloadBtn?.addEventListener('pointerdown', rd);

    const readInput = (): Input => {
      const k = (n: string) => (keys.has(n) ? 1 : 0);
      let fwd = k('w') + k('arrowup') - k('s') - k('arrowdown');
      let strafe = k('d') + k('arrowright') - k('a') - k('arrowleft');
      if (stick.id >= 0) {
        fwd = -stick.y;
        strafe = stick.x;
      }
      const inp: Input = { fwd, strafe, fire: fireHeld, reload: reloadReq };
      reloadReq = false;
      return inp;
    };

    /* ---------- red ---------- */
    const toState = (p: Match['players'][number]): StateMsg => packState(p);
    const applyState = (s: StateMsg) => {
      const p = m.players.find((x) => x.id === s.id);
      if (!p || p.id === myId || (p.isBot && isHost)) return;
      targets.set(p.id, { x: s.x, y: s.y, h: s.h });
      p.hp = s.hp;
      p.ammo = s.am;
      if (s.f) p.flash = 0.1;
      if (!s.a && p.alive) {
        eliminate(m, p.id, null);
        addFeed(`${p.name} ${tr('quedó fuera', 'is out')}`);
      }
    };
    msgRef.current = (msg) => {
      if (msg.k === 'state') applyState(msg.s);
      else if (msg.k === 'bots') for (const s of msg.list) applyState(s);
      else if (msg.k === 'shot') {
        const p = m.players.find((x) => x.id === msg.id);
        if (p && p.id !== myId) {
          p.flash = 0.12;
          m.events.push({ k: 'shot', id: p.id, x: msg.x, y: msg.y, heading: msg.h });
        }
      } else if (msg.k === 'hit') {
        const v = m.players.find((x) => x.id === msg.victim);
        if (!v || !owns(v)) return;
        if (registerHit(m, msg.victim, msg.killer) ) send({ k: 'dead', victim: msg.victim, killer: msg.killer });
      } else if (msg.k === 'dead') {
        const v = m.players.find((x) => x.id === msg.victim);
        if (v?.alive) {
          eliminate(m, msg.victim, msg.killer);
          addFeed(`${nameOf(msg.killer ?? 'zona')} → ${v.name}`);
        }
      }
    };
    membersRef.current = (list) => {
      if (!online) return;
      const ids = new Set(list.map((x) => x.id));
      for (const p of m.players) {
        if (p.isBot || p.id === myId || !p.alive || ids.has(p.id)) continue;
        eliminate(m, p.id, null);
        addFeed(`${p.name} ${tr('se desconectó', 'disconnected')}`);
      }
      if (!isHost && !list.some((x) => x.host)) for (const p of m.players) if (p.isBot && p.alive) eliminate(m, p.id, null);
    };

    /* ---------- efectos de los sucesos de la partida ---------- */
    const lastShot = new Map<string, { x: number; y: number }>();
    const handleEvents = () => {
      for (const ev of m.events.splice(0, m.events.length)) {
        if (ev.k === 'shot') {
          lastShot.set(ev.id, { x: ev.x, y: ev.y });
          if (ev.id === myId || (online && isHost && m.players.find((p) => p.id === ev.id)?.isBot)) send({ k: 'shot', id: ev.id, x: ev.x, y: ev.y, h: ev.heading });
          if (ev.id === myId) sfx.click();
        } else if (ev.k === 'splat') {
          const from = [...lastShot.entries()].pop();
          fx.splats.push({ x: ev.x, y: ev.y, hue: ev.hue, r: 22 + Math.random() * 14, t: 1.4 });
          if (fx.splats.length > 90) fx.splats.shift();
          if (from) fx.tracers.push({ x0: from[1].x, y0: from[1].y, x1: ev.x, y1: ev.y, hue: ev.hue, t: 0.16 });
        } else if (ev.k === 'hit') {
          if (ev.victim === myId) {
            fx.screen.push({ x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, hue: m.players.find((p) => p.id === ev.killer)?.hue ?? 200, r: 0.18 + Math.random() * 0.12, t: 1.1 });
            fx.shake = 1;
            if (!ev.dead) addFeed(`${nameOf(ev.killer)} ${tr('te manchó', 'splatted you')}`);
          }
          if (ev.killer === myId) fx.hitMarker = 0.22;
          if (ev.dead) addFeed(`${nameOf(ev.killer)} → ${nameOf(ev.victim)}`);
        }
      }
    };

    const processHits = () => {
      for (const h of takeHits(m)) {
        const v = m.players.find((p) => p.id === h.victim);
        if (!v || !v.alive) continue;
        if (!online || owns(v)) {
          if (registerHit(m, h.victim, h.killer)) send({ k: 'dead', victim: h.victim, killer: h.killer });
        } else {
          send({ k: 'hit', victim: h.victim, killer: h.killer });
          if (h.killer === myId) fx.hitMarker = 0.22;
        }
      }
      const ownedIds = m.players.filter((p) => owns(p)).map((p) => p.id);
      for (const dead of applyZone(m, ownedIds)) {
        addFeed(`${nameOf('zona')} → ${nameOf(dead)}`);
        send({ k: 'dead', victim: dead, killer: null });
      }
    };

    const sendNet = (now: number) => {
      if (!online || !net || now - netAt < 110) return;
      netAt = now;
      net.send({ k: 'state', s: toState(me) });
      if (isHost) net.send({ k: 'bots', list: m.players.filter((p) => p.isBot).map(toState) });
    };

    const frame = (now: number) => {
      if (id !== runId.current) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      // mirada
      if (me.alive && countdown <= 0) me.heading += lookDx * 0.0027;
      lookDx = 0;
      if (me.alive) {
        const k = (n: string) => (keys.has(n) ? 1 : 0);
        me.heading += (k('e') - k('q')) * 2 * dt;
      }
      if (countdown > 0) countdown -= dt;
      else if (!m.over) {
        acc += dt;
        const input = me.alive ? readInput() : { fwd: 0, strafe: 0, fire: false, reload: false };
        let n = 0;
        while (acc >= 1 / 60 && n++ < 6) {
          step(m, 1 / 60, { [myId]: input }, !online || isHost);
          input.reload = false;
          acc -= 1 / 60;
        }
        processHits();
        moving += ((Math.hypot(input.fwd, input.strafe) > 0.1 ? 1 : 0) - moving) * Math.min(1, dt * 10);
        if (moving > 0.2) walkPhase += dt * 9;
      }
      handleEvents();
      // jugadores remotos: se acercan suavemente a lo recibido
      for (const [pid, t] of targets) {
        const p = m.players.find((x) => x.id === pid);
        if (!p) continue;
        const k = Math.min(1, dt * 14);
        p.x += (t.x - p.x) * k;
        p.y += (t.y - p.y) * k;
        let dh = t.h - p.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        p.heading += dh * k;
      }
      // efectos
      fx.hitMarker = Math.max(0, fx.hitMarker - dt);
      fx.shake = Math.max(0, fx.shake - dt * 3);
      for (const s of fx.splats) s.t -= dt * 0.04;
      fx.splats = fx.splats.filter((s) => s.t > 0.05);
      for (const t of fx.tracers) t.t -= dt;
      fx.tracers = fx.tracers.filter((t) => t.t > 0);
      for (const s of fx.screen) s.t -= dt * 0.55;
      fx.screen = fx.screen.filter((s) => s.t > 0);
      sendNet(now);

      // a quién se mira: a ti, o si caíste, al rival vivo más cercano
      let view = me;
      if (!me.alive) {
        const alive = m.players.filter((p) => p.alive);
        const keep = spectate ? alive.find((p) => p.id === spectate) : undefined;
        const pick = keep ?? alive.sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (pick) {
          spectate = pick.id;
          view = pick;
        }
      }
      const zone = zoneAt(m.t, m.seed);
      const bob = reduced ? 0 : Math.sin(walkPhase) * 3.2 * moving;
      const v: View = { ctx, W, H, time, reduced };
      ctx.clearRect(0, 0, W, H);
      drawScene(v, art, m, view, zone, fx, bob);
      if (view === me && me.alive) drawWeapon(v, me, bob, moving);
      if (fx.hitMarker > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${fx.hitMarker * 4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
          ctx.moveTo(W / 2 + dx * 8, H * 0.44 + dy * 8);
          ctx.lineTo(W / 2 + dx * 18, H * 0.44 + dy * 18);
        }
        ctx.stroke();
      }
      const mini = miniRef.current;
      if (mini) drawRadar(mini.getContext('2d')!, mini.width, m, view, zone);

      if (now - uiAt > 110) {
        uiAt = now;
        setHud({
          alive: m.alive,
          kills: me.kills,
          hp: Math.max(0, me.hp),
          ammo: me.ammo,
          reload: me.reload > 0 ? 1 - me.reload / RELOAD_TIME : 0,
          zone: zone.closing ? tr('la opacidad se cierra', 'the haze is closing') : zone.r <= 40 ? tr('círculo final', 'final circle') : `${tr('se cierra en', 'closes in')} ${Math.ceil(zone.hold)}s`,
          count: Math.max(0, Math.ceil(countdown)),
          dead: !me.alive,
          place: me.placement,
          locked: touch || locked(),
          spectating: view !== me ? view.name : '',
        });
        setFeed(feedLines.filter((f) => now - f.at < 5000).map((f) => ({ ...f })));
      }
      if (m.over && !ended) {
        ended = true;
        window.setTimeout(() => id === runId.current && finish(m, myId), 1500);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __paintball?: Match }).__paintball = m;

    return () => {
      runId.current++;
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      document.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
      fireBtn?.removeEventListener('pointerdown', fd);
      window.removeEventListener('pointerup', fu);
      reloadBtn?.removeEventListener('pointerdown', rd);
      msgRef.current = () => undefined;
      membersRef.current = () => undefined;
    };
  }, [phase, touch, finish]);

  /* ---------- salas y arranque ---------- */
  const buildBots = (seed: number, count: number, startIndex = 0) => {
    const rnd = mulberry32(seed ^ 0x9e3779b1);
    const names = lang === 'en' ? BOT_NAMES_EN : BOT_NAMES;
    const inits: PlayerInit[] = [];
    const specs: Record<string, AvatarSpec | null> = {};
    for (let i = 0; i < count; i++) {
      const bid = `b${i}`;
      inits.push({ id: bid, name: names[(i + startIndex) % names.length], isBot: true, hue: ((i + startIndex) * 47 + 20) % 360 });
      specs[bid] = randomAvatar(rnd);
    }
    return { inits, specs };
  };

  const startSolo = () => {
    sfx.click();
    const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    const bots = buildBots(seed, TOTAL - 1);
    cfgRef.current = { seed, inits: [{ id: 'me', name: meName, isBot: false, hue: 190 }, ...bots.inits], specs: { me: avatarStore.get(), ...bots.specs }, online: false, isHost: false };
    setOutcome(null);
    setFeed([]);
    setPhase('play');
  };

  const startFromMsg = useCallback((start: { seed: number; roster: PlayerInit[]; specs: Record<string, AvatarSpec | null> }, host: boolean) => {
    cfgRef.current = { seed: start.seed, inits: start.roster, specs: start.specs, online: true, isHost: host };
    setOutcome(null);
    setFeed([]);
    setPhase('play');
  }, []);

  const hostStart = () => {
    const net = netRef.current;
    if (!net) return;
    const humans = net.members.slice(0, TOTAL);
    const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    const bots = buildBots(seed, TOTAL - humans.length, humans.length);
    const roster: PlayerInit[] = [...humans.map((h) => ({ id: h.id, name: h.name, hue: h.hue, isBot: false })), ...bots.inits];
    const specs: Record<string, AvatarSpec | null> = { ...bots.specs };
    for (const h of humans) specs[h.id] = h.spec;
    net.send({ k: 'start', seed, roster, specs });
    startFromMsg({ seed, roster, specs }, true);
  };

  const openRoom = async (code: string, host: boolean) => {
    if (!netAvailable()) {
      setLobbyMsg(tr('las salas en línea no están disponibles ahora.', 'online rooms are not available right now.'));
      return;
    }
    setJoining(true);
    setLobbyMsg(null);
    const me: Member = { id: meId.current, name: meName, hue: Math.floor(Math.random() * 360), spec: avatarStore.get(), host };
    const net = new RoyaleNet<PbMsg>(code, me, {
      members: (l) => {
        setMembers(l);
        membersRef.current(l);
      },
      msg: (m) => msgRef.current(m),
      error: () => setLobbyMsg(tr('se perdió la conexión con la sala.', 'the connection to the room was lost.')),
    }, 'paintball');
    msgRef.current = (m) => {
      if (m.k === 'start') startFromMsg(m, false);
    };
    try {
      await net.join();
      if (!host && !net.members.some((x) => x.host)) {
        await net.close();
        setLobbyMsg(tr('no encontré esa sala. revisa el código.', 'could not find that room. check the code.'));
        return;
      }
      netRef.current = net;
      setRoomCode(code);
      setPhase('lobby');
    } catch {
      void net.close();
      setLobbyMsg(tr('no se pudo conectar con la sala. inténtalo de nuevo.', 'could not connect to the room. try again.'));
    } finally {
      setJoining(false);
    }
  };

  const leaveRoom = () => {
    void netRef.current?.close();
    netRef.current = null;
    setMembers([]);
    setPhase('menu');
  };

  useEffect(() => () => { void netRef.current?.close(); }, []);

  if (phase === 'lobby') {
    const isHost = members.find((x) => x.id === meId.current)?.host ?? false;
    return (
      <main className="royale royale--menu">
        <div className="royale__card">
          <BrandOrb size={56} />
          <p className="royale__kicker">paintball · {tr('sala', 'room')}</p>
          <h1 className="royale__code">{roomCode}</h1>
          <p className="royale__lead">{tr(`comparte este código con tus amigos. quien creó la sala empieza; los huecos hasta ${TOTAL} los llenan bots.`, `share this code with your friends. the room creator starts; empty slots up to ${TOTAL} are filled with bots.`)}</p>
          <ul className="royale__roster">
            {members.map((x) => <li key={x.id}><i style={{ background: `hsl(${x.hue} 80% 62%)` }} />{x.name}{x.host ? ` · ${tr('anfitrión', 'host')}` : ''}</li>)}
          </ul>
          <small>{members.length} {tr(`de ${TOTAL} jugadores`, `of ${TOTAL} players`)} · {TOTAL - members.length} {tr('bots completarán', 'bots will fill in')}</small>
          <div className="royale__actions">
            {isHost ? <button type="button" className="vista-button vista-button--primary" onClick={hostStart}>{tr('empezar partida', 'start match')}</button> : <span className="royale__wait">{tr('esperando al anfitrión...', 'waiting for the host...')}</span>}
            <button type="button" className="vista-button" onClick={leaveRoom}>{tr('salir de la sala', 'leave room')}</button>
          </div>
          {lobbyMsg && <small role="alert">{lobbyMsg}</small>}
        </div>
      </main>
    );
  }

  if (phase === 'over' && outcome) return <BattleResult outcome={outcome} onAgain={startSolo} onMenu={() => setPhase('menu')} />;

  if (phase === 'menu' || phase === 'over') {
    return (
      <main className="royale royale--menu">
        <div className="royale__card">
          <BrandOrb size={72} />
          <p className="royale__kicker">aero arena</p>
          <h1>paintball royale</h1>
          <p className="royale__lead">{tr('ocho jugadores, primera persona y una isla que se cierra. dispara pintura, ponte a cubierto y escapa de la opacidad: tres manchas y quedas fuera. gana el último en pie.', 'eight players, first person and a closing island. shoot paint, take cover and escape the haze: three splats and you are out. last one standing wins.')}</p>
          <div className="royale__actions">
            <button type="button" className="vista-button vista-button--primary" onClick={startSolo}>{tr('jugar contra 7 bots', 'play vs 7 bots')}</button>
            <button type="button" className="vista-button" onClick={() => setHelp((v) => !v)} aria-expanded={help}>{tr('cómo se juega', 'how to play')}</button>
            <a className="landing__text-link" href="#/arena">{tr('‹ aero arena', '‹ aero arena')}</a>
          </div>
          <div className="royale__online">
            <strong>{tr('sala en línea con amigos', 'online room with friends')}</strong>
            <div className="royale__row">
              <button type="button" className="vista-button" disabled={joining} onClick={() => void openRoom(newRoomCode(), true)}>{tr('crear sala', 'create room')}</button>
              <input value={joinCode} onChange={(e) => setJoinCode(cleanCode(e.target.value))} placeholder={tr('código', 'code')} aria-label={tr('código de la sala', 'room code')} maxLength={4} />
              <button type="button" className="vista-button" disabled={joining || joinCode.length < 4} onClick={() => void openRoom(joinCode, false)}>{joining ? '…' : tr('unirme', 'join')}</button>
            </div>
            {lobbyMsg && <small role="alert">{lobbyMsg}</small>}
          </div>
          {help && (
            <ul className="royale__help">
              <li><b>{tr('mover', 'move')}</b> {touch ? tr('joystick a la izquierda', 'left joystick') : 'W A S D'}</li>
              <li><b>{tr('mirar', 'look')}</b> {touch ? tr('arrastra en la mitad derecha', 'drag on the right half') : tr('ratón (haz clic en la pantalla para capturarlo)', 'mouse (click the screen to capture it)')}</li>
              <li><b>{tr('disparar', 'shoot')}</b> {touch ? tr('botón de pintura', 'paint button') : tr('clic izquierdo o espacio', 'left click or space')} · <b>{tr('recargar', 'reload')}</b> R</li>
              <li><b>{tr('cobertura', 'cover')}</b> {tr('los árboles y rocas frenan la pintura', 'trees and rocks block paint')}</li>
              <li><b>{tr('la opacidad', 'the haze')}</b> {tr('fuera del círculo luminoso pierdes vida', 'outside the glowing circle you lose health')}</li>
            </ul>
          )}
          <ProgressCard />
        </div>
      </main>
    );
  }

  return (
    <main className="royale royale--play pb" aria-label="paintball royale">
      <canvas ref={canvasRef} className="pb__canvas" />
      <div className="royale__hud">
        <div className="royale__chips">
          <span><b>{hud.alive}</b> {tr('vivos', 'alive')}</span>
          <span><b>{hud.kills}</b> {tr('bajas', 'hits')}</span>
        </div>
        <div className="royale__zone">{hud.zone}</div>
        <canvas ref={miniRef} className="royale__mini" width={132} height={132} aria-hidden="true" />
        <ul className="royale__feed" aria-live="polite">{feed.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
        <div className="pb__vitals">
          <div className="pb__drops" aria-label={`${hud.hp} / ${MAX_HP}`}>{Array.from({ length: MAX_HP }, (_, i) => <i key={i} className={i < hud.hp ? 'is-on' : ''} />)}</div>
          <div className="pb__ammo"><b>{hud.reload > 0 ? tr('recargando', 'reloading') : `${hud.ammo}`}</b><small>/ {MAX_AMMO}</small>{hud.reload > 0 && <i style={{ width: `${hud.reload * 100}%` }} />}</div>
        </div>
        {hud.count > 0 && <div className="royale__count" aria-live="assertive">{hud.count}</div>}
        {!hud.locked && !hud.dead && hud.count === 0 && <div className="pb__lock">{tr('haz clic para capturar el ratón y disparar', 'click to capture the mouse and shoot')}</div>}
        {hud.dead && (
          <div className="royale__dead" role="status">
            <strong>{tr('quedaste fuera', 'you are out')} · {tr('puesto', 'place')} {hud.place}</strong>
            {hud.spectating && <span>{tr('mirando a', 'watching')} {hud.spectating}</span>}
          </div>
        )}
        <div ref={stickRef} className="royale__stick" aria-hidden="true"><i /></div>
        {touch && !hud.dead && (
          <>
            <button id="pb-fire" type="button" className="royale__fire pb__fire" aria-label={tr('disparar', 'shoot')}>◎</button>
            <button id="pb-reload" type="button" className="pb__reload" aria-label={tr('recargar', 'reload')}>↻</button>
          </>
        )}
        <button type="button" className="royale__exit vista-button" onClick={() => { runId.current++; void netRef.current?.close(); netRef.current = null; setPhase('menu'); }}>{tr('salir', 'exit')}</button>
      </div>
    </main>
  );
}

export { routeHref };
