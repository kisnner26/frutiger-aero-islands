import { useCallback, useEffect, useRef, useState } from 'react';
import { routeHref } from '../../app/useHashRoute';
import { randomAvatar, type AvatarSpec } from '../../avatar/model';
import { avatarStore } from '../../avatar/store';
import { sfx } from '../../audio/sfx';
import { tr, lang } from '../../i18n';
import { useSession } from '../../persistence/session';
import { BrandOrb } from '../../ui/Brand';
import { mulberry32 } from '../minigames/rng';
import { burst, draw, drawMinimap, newFx, stepFx, RoyaleArt, type Fx } from './render';
import { createMatch, eliminate, registerHit, step, zoneAt, BULLET_DMG, BULLET_LIFE, MAX_HP, type Input, type Match, type PlayerInit, type RoyaleEvent } from './sim';
import { cleanCode, netAvailable, newRoomCode, RoyaleNet, type Member, type NetMsg, type StartMsg, type StateMsg } from './net';
import { BattleResult, ProgressCard } from './BattleResult';
import { recordMatch, type Outcome } from './progress';
import './royale.css';

const BOT_NAMES = ['burbuja', 'delfín', 'nenúfar', 'cristal', 'medusa', 'brisa', 'coral', 'perla', 'aqua', 'bruma', 'nube', 'marea'];
const BOT_NAMES_EN = ['bubble', 'dolphin', 'lily', 'crystal', 'jelly', 'breeze', 'coral', 'pearl', 'aqua', 'mist', 'cloud', 'tide'];
interface Feed { id: number; text: string; at: number }

export function RoyalePage() {
  const session = useSession();
  const [phase, setPhase] = useState<'menu' | 'lobby' | 'play' | 'over'>('menu');
  const [members, setMembers] = useState<Member[]>([]);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [lobbyMsg, setLobbyMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const netRef = useRef<RoyaleNet | null>(null);
  const msgRef = useRef<(m: NetMsg) => void>(() => undefined);
  const membersRef = useRef<(l: Member[]) => void>(() => undefined);
  const cfgRef = useRef<{ seed: number; inits: PlayerInit[]; specs: Record<string, AvatarSpec | null>; online: boolean; isHost: boolean } | null>(null);
  const meId = useRef(`u${Math.random().toString(36).slice(2, 8)}`);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const powersRef = useRef(0);
  const [help, setHelp] = useState(false);
  const [hud, setHud] = useState({ alive: 12, kills: 0, hp: MAX_HP, maxHp: MAX_HP, shield: 0, frenzy: 0, combo: 0, comboLeft: 0, rush: false, triple: false, zone: '', count: 3, dead: false, place: 0, banner: '' });
  const [feed, setFeed] = useState<Feed[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const meName = session.username ? `@${session.username}` : tr('tú', 'you');
  const runId = useRef(0);

  const finish = useCallback((m: Match) => {
    const me = m.players.find((p) => p.id === meId.current || p.id === 'me')!;
    const placement = me.placement || 1;
    const result = recordMatch({
      mode: 'royale', placement, players: m.players.length, kills: me.kills, bestCombo: me.bestCombo, powers: powersRef.current,
      seconds: m.t, mass: 0, ate: 0, lowHpWin: placement === 1 && me.hp < 25,
    });
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
    const meP = m.players.find((p) => p.id === myId)!;
    const art = new RoyaleArt(seed);
    const fx: Fx = newFx();
    const keys = new Set<string>();
    const pointer = { x: 0, y: 0, down: false, mouse: false };
    const stick = { active: false, id: -1, cx: 0, cy: 0, x: 0, y: 0 };
    const touchFire = { down: false };
    let tapFlag = false;
    let lastAim = 0;
    let zoomNow = 1;
    const focus = { x: 0, y: 0 };
    let countdown = 3.2;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let time = 0;
    let uiAt = 0;
    let feedId = 1;
    let ended = false;
    let speedUp = 1;
    const feedLines: Feed[] = [];
    const nameOf = (pid: string) => (pid === 'zona' ? tr('la opacidad', 'the haze') : m.players.find((p) => p.id === pid)?.name ?? '?');
    const addFeed = (text: string) => {
      feedLines.push({ id: feedId++, text, at: performance.now() });
      if (feedLines.length > 5) feedLines.shift();
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (down) {
        if (k === ' ' && !e.repeat) tapFlag = true;
        keys.add(k);
      } else keys.delete(k);
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width };
    };
    const pd = (e: PointerEvent) => {
      const p = pos(e);
      if (e.pointerType === 'mouse') {
        pointer.mouse = true;
        pointer.down = true;
        tapFlag = true;
        pointer.x = p.x;
        pointer.y = p.y;
        return;
      }
      // táctil: la mitad izquierda es el joystick
      if (p.x < p.w * 0.5 && !stick.active) {
        stick.active = true;
        stick.id = e.pointerId;
        stick.cx = p.x;
        stick.cy = p.y;
        stick.x = 0;
        stick.y = 0;
        if (stickRef.current) {
          stickRef.current.style.display = 'block';
          stickRef.current.style.left = `${p.x - 55}px`;
          stickRef.current.style.top = `${p.y - 55}px`;
        }
      }
      canvas.setPointerCapture?.(e.pointerId);
    };
    const pm = (e: PointerEvent) => {
      const p = pos(e);
      if (e.pointerType === 'mouse') {
        pointer.mouse = true;
        pointer.x = p.x;
        pointer.y = p.y;
        return;
      }
      if (stick.active && e.pointerId === stick.id) {
        const dx = p.x - stick.cx;
        const dy = p.y - stick.cy;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 55);
        stick.x = (dx / len) * k;
        stick.y = (dy / len) * k;
        const knob = stickRef.current?.firstElementChild as HTMLElement | null;
        if (knob) knob.style.transform = `translate(${stick.x * 40}px, ${stick.y * 40}px)`;
      }
    };
    const pu = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        pointer.down = false;
        return;
      }
      if (e.pointerId === stick.id) {
        stick.active = false;
        stick.x = 0;
        stick.y = 0;
        if (stickRef.current) stickRef.current.style.display = 'none';
      }
    };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', pu);
    const fireBtn = document.getElementById('royale-fire');
    const fd = (e: Event) => { e.preventDefault(); touchFire.down = true; tapFlag = true; };
    const fu = () => { touchFire.down = false; };
    fireBtn?.addEventListener('pointerdown', fd);
    window.addEventListener('pointerup', fu);

    const readInput = (): Input => {
      let mx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      let my = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
      if (stick.active) {
        mx = stick.x;
        my = stick.y;
      }
      const me = meP;
      let aim = lastAim;
      const firing = (pointer.mouse && pointer.down) || keys.has(' ') || touchFire.down;
      if (pointer.mouse) aim = Math.atan2(pointer.y - canvas.clientHeight / 2, pointer.x - canvas.clientWidth / 2);
      else {
        // en táctil la puntería es asistida: apunta al rival más cercano al alcance, o hacia donde camina
        let best = 620;
        let tgt: { x: number; y: number } | null = null;
        for (const p of m.players) {
          if (!p.alive || p.id === myId) continue;
          const d = Math.hypot(p.x - me.x, p.y - me.y);
          if (d < best) { best = d; tgt = p; }
        }
        if (tgt) aim = Math.atan2(tgt.y - me.y, tgt.x - me.x);
        else if (mx || my) aim = Math.atan2(my, mx);
      }
      lastAim = aim;
      const tap = tapFlag && countdown <= 0;
      tapFlag = false;
      return { mx, my, aim, fire: firing && countdown <= 0, tap };
    };

    const handle = (ev: RoyaleEvent) => {
      if (ev.type === 'shot') {
        if (ev.bullet.owner === myId) sfx.pop();
        if (online && (ev.bullet.owner === myId || (isHost && m.players.find((p) => p.id === ev.bullet.owner)?.isBot))) net?.send({ k: 'shot', owner: ev.bullet.owner, x: ev.bullet.x, y: ev.bullet.y, vx: ev.bullet.vx, vy: ev.bullet.vy, dmg: ev.bullet.dmg });
      } else if (ev.type === 'hit') {
        const v = m.players.find((p) => p.id === ev.victim);
        if (v) {
          fx.flash[v.id] = 1;
          fx.floats.push({ x: v.x, y: v.y - 40, text: `-${Math.round(ev.dmg)}`, life: 0.9, color: '#ffe36a' });
          if (online && v.auth) net?.send({ k: 'hit', victim: ev.victim, killer: ev.killer, dmg: ev.dmg, dead: ev.dead });
          if (v.id === myId) {
            fx.shake = 9;
            sfx.error();
          }
          if (ev.dead) {
            burst(fx, v.x, v.y, v.hue, 22);
            addFeed(ev.killer === 'zona' ? `${v.name} ${tr('se perdió en la opacidad', 'was lost in the haze')}` : `${nameOf(ev.killer)} ${tr('reventó a', 'popped')} ${v.name}`);
          }
        }
      } else if (ev.type === 'fall') {
        const v = m.players.find((p) => p.id === ev.player);
        if (v) {
          if (online && v.auth) net?.send({ k: 'fall', player: v.id });
          burst(fx, v.x, v.y, 200, 18);
          addFeed(`${v.name} ${tr('cayó al lago', 'fell into the lake')}`);
        }
      } else if (ev.type === 'pickup') {
        const v = m.players.find((p) => p.id === ev.player);
        if (v) {
          fx.floats.push({ x: v.x, y: v.y - 36, text: { heart: '+hp', shield: '+escudo', rapid: tr('ráfaga', 'rapid'), speed: tr('veloz', 'speed') }[ev.kind], life: 1, color: '#9affb0' });
          if (v.id === myId) {
            sfx.coin();
            powersRef.current += 1;
          }
          if (online && v.auth) net?.send({ k: 'pickup', id: ev.id, player: v.id, kind: ev.kind });
        }
      } else if (ev.type === 'combo') {
        if (ev.player === myId) {
          fx.floats.push({ x: meP.x, y: meP.y - 64, text: `x${ev.combo}`, life: 1.1, color: ev.combo >= 8 ? '#ffd24a' : '#fff' });
          if (ev.reward) {
            const label = { heal: tr('+vida', '+health'), shield: tr('+escudo', '+shield'), triple: tr('ráfaga triple', 'triple shot'), ring: tr('anillo de burbujas', 'bubble ring'), life: tr('+40 vida máxima', '+40 max health') }[ev.reward];
            setHud((h) => ({ ...h, banner: `${tr('combo', 'combo')} x${ev.combo}: ${label}` }));
            window.setTimeout(() => setHud((h) => ({ ...h, banner: '' })), 2200);
            sfx.levelUp();
            burst(fx, meP.x, meP.y, 50, 16);
          } else sfx.coin();
        }
      } else if (ev.type === 'frenzy') {
        if (ev.player === myId) {
          fx.floats.push({ x: meP.x, y: meP.y - 50, text: [tr('', ''), tr('calentando', 'warming up'), tr('frenesí', 'frenzy'), tr('furia', 'fury'), 'AERO RUSH'][ev.tier] ?? '', life: 1, color: '#ffe36a' });
          burst(fx, meP.x, meP.y, 45, 10);
        }
      } else if (ev.type === 'phase') {
        setHud((h) => ({ ...h, banner: tr('la opacidad avanza', 'the haze is closing in') }));
        window.setTimeout(() => setHud((h) => ({ ...h, banner: '' })), 3200);
      }
    };


    // ---- en línea: mensajes entrantes y envío periódico del propio estado ----
    const applyState = (st: StateMsg) => {
      const p = m.players.find((q) => q.id === st.id);
      if (!p || p.auth) return;
      p.tx = st.x;
      p.ty = st.y;
      p.vx = st.vx;
      p.vy = st.vy;
      p.aim = st.aim;
      p.hp = st.hp;
      p.shield = st.shield;
      p.rapid = st.rapid;
      p.speed = st.speed;
      if (!st.alive && p.alive) {
        eliminate(m, p, null);
        burst(fx, p.x, p.y, p.hue, 18);
      }
    };
    if (online) {
      msgRef.current = (msg) => {
        if (msg.k === 'state') applyState(msg.s);
        else if (msg.k === 'bots') msg.list.forEach(applyState);
        else if (msg.k === 'shot') {
          const owner = m.players.find((p) => p.id === msg.owner);
          if (owner && owner.alive) m.bullets.push({ id: -(m.nextId++), owner: msg.owner, x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy, life: BULLET_LIFE, dmg: msg.dmg ?? BULLET_DMG });
        } else if (msg.k === 'hit') {
          const v = m.players.find((p) => p.id === msg.victim);
          if (msg.killer === myId && v) for (const e2 of registerHit(m, meP, msg.dead)) handle(e2);
          if (v && !v.auth) {
            fx.flash[v.id] = 1;
            fx.floats.push({ x: v.x, y: v.y - 40, text: `-${Math.round(msg.dmg)}`, life: 0.9, color: '#ffe36a' });
            if (msg.dead && v.alive) {
              eliminate(m, v, msg.killer === 'zona' ? null : msg.killer);
              burst(fx, v.x, v.y, v.hue, 22);
              addFeed(msg.killer === 'zona' ? `${v.name} ${tr('se perdió en la opacidad', 'was lost in the haze')}` : `${nameOf(msg.killer)} ${tr('reventó a', 'popped')} ${v.name}`);
            }
          }
        } else if (msg.k === 'fall') {
          const v = m.players.find((p) => p.id === msg.player);
          if (v && v.alive && !v.auth) {
            eliminate(m, v, null);
            burst(fx, v.x, v.y, 200, 18);
            addFeed(`${v.name} ${tr('cayó al lago', 'fell into the lake')}`);
          }
        } else if (msg.k === 'pickup') {
          const i = m.pickups.findIndex((k) => k.id === msg.id);
          if (i >= 0) m.pickups.splice(i, 1);
        }
      };
    }
    let netAt = 0;
    const toState = (p: typeof meP): StateMsg => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), vy: Math.round(p.vy), aim: Math.round(p.aim * 100) / 100, hp: Math.round(p.hp), shield: Math.round(p.shield), alive: p.alive, rapid: p.rapid, speed: p.speed });
    const sendNet = (now: number) => {
      if (!online || !net || now - netAt < 110) return;
      netAt = now;
      net.send({ k: 'state', s: toState(meP) });
      if (isHost) net.send({ k: 'bots', list: m.players.filter((p) => p.isBot).map(toState) });
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
          for (const ev of step(m, 1 / 60, { [myId]: input })) handle(ev);
          acc -= 1 / 60;
        }
      }
      stepFx(fx, dt);
      sendNet(now);
      const me = meP;
      // la cámara sigue a quien juega; si caíste, al jugador vivo más cercano (o al ganador)
      let target = me.alive ? me : m.players.filter((p) => p.alive).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0] ?? me;
      focus.x += (target.x - focus.x) * Math.min(1, dt * 8);
      focus.y += (target.y - focus.y) * Math.min(1, dt * 8);
      const wantZoom = Math.min(Math.max(Math.min(w, h) / 980, 0.5), 1.15);
      zoomNow += (wantZoom - zoomNow) * Math.min(1, dt * 4);
      draw({ ctx, w, h, m, focus, zoom: zoomNow, art, fx, specs, me: myId, time });
      const mini = miniRef.current;
      if (mini) drawMinimap(mini.getContext('2d')!, mini.width, m, myId);

      if (now - uiAt > 120) {
        uiAt = now;
        const z = zoneAt(m.t);
        setHud({
          alive: m.players.filter((p) => p.alive).length,
          kills: me.kills,
          hp: Math.max(0, Math.round(me.hp)),
          maxHp: me.maxHp,
          shield: Math.round(me.shield),
          frenzy: Math.round(me.frenzy),
          combo: me.combo,
          comboLeft: Math.max(0, 1.8 - (m.t - me.comboAt)),
          rush: me.rush > 0,
          triple: me.triple > 0,
          zone: z.phase >= 4 ? tr('zona final', 'final zone') : z.shrinking ? tr('la opacidad avanza', 'the haze advances') : `${tr('próximo cierre', 'next closing')} ${Math.ceil(z.next)}s`,
          count: Math.max(0, Math.ceil(countdown)),
          dead: !me.alive,
          place: me.placement,
          banner: '',
        });
        setFeed(feedLines.filter((f) => now - f.at < 5000).map((f) => ({ ...f })));
      }
      if (m.over && !ended) {
        ended = true;
        window.setTimeout(() => id === runId.current && finish(m), 1100);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    (window as unknown as { __royaleSpeed?: (n: number) => void }).__royaleSpeed = (n) => { speedUp = n; };
    (window as unknown as { __royale?: Match }).__royale = m;
    // si alguien se desconecta de una sala, sale de la partida; si es quien manda sobre los bots, los bots también
    const onMembers = (list: Member[]) => {
      if (!online) return;
      const ids = new Set(list.map((x) => x.id));
      for (const p of m.players) {
        if (p.isBot || p.id === myId || !p.alive || ids.has(p.id)) continue;
        eliminate(m, p, null);
        addFeed(`${p.name} ${tr('se desconectó', 'disconnected')}`);
      }
      if (!isHost && !list.some((x) => x.host)) for (const p of m.players) if (p.isBot && p.alive) eliminate(m, p, null);
    };
    membersRef.current = onMembers;

    return () => {
      runId.current++;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
      fireBtn?.removeEventListener('pointerdown', fd);
      window.removeEventListener('pointerup', fu);
      msgRef.current = () => undefined;
      membersRef.current = () => undefined;
    };
  }, [phase, meName, finish]);

  const buildBots = (seed: number, count: number, startIndex = 0) => {
    const rnd = mulberry32(seed ^ 0x9e3779b1);
    const names = lang === 'en' ? BOT_NAMES_EN : BOT_NAMES;
    const inits: PlayerInit[] = [];
    const specs: Record<string, AvatarSpec | null> = {};
    for (let i = 0; i < count; i++) {
      const bid = `b${i}`;
      inits.push({ id: bid, name: names[(i + startIndex) % names.length], isBot: true, auth: true, hue: ((i + startIndex) * 47 + 20) % 360 });
      specs[bid] = randomAvatar(rnd);
    }
    return { inits, specs };
  };

  const startSolo = () => {
    sfx.click();
    const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    const bots = buildBots(seed, 11);
    cfgRef.current = { seed, inits: [{ id: 'me', name: meName, isBot: false, auth: true, hue: 190 }, ...bots.inits], specs: { me: avatarStore.get(), ...bots.specs }, online: false, isHost: false };
    setOutcome(null);
    powersRef.current = 0;
    setFeed([]);
    setPhase('play');
  };

  /** parte de una partida en línea: los humanos de la sala y bots hasta completar doce. */
  const startFromMsg = useCallback((start: StartMsg, host: boolean) => {
    const inits: PlayerInit[] = start.roster.map((r) => ({ id: r.id, name: r.name, isBot: r.isBot, auth: r.id === meId.current || (r.isBot && host), hue: r.hue }));
    cfgRef.current = { seed: start.seed, inits, specs: start.specs, online: true, isHost: host };
    setOutcome(null);
    powersRef.current = 0;
    setFeed([]);
    setPhase('play');
  }, []);

  const hostStart = () => {
    const net = netRef.current;
    if (!net) return;
    const humans = net.members.slice(0, 12);
    const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
    const bots = buildBots(seed, 12 - humans.length, humans.length);
    const roster = [
      ...humans.map((h) => ({ id: h.id, name: h.name, hue: h.hue, isBot: false })),
      ...bots.inits.map((b) => ({ id: b.id, name: b.name, hue: b.hue, isBot: true })),
    ];
    const specs: Record<string, AvatarSpec | null> = { ...bots.specs };
    for (const h of humans) specs[h.id] = h.spec;
    const start: StartMsg = { seed, roster, specs };
    net.send({ k: 'start', start });
    startFromMsg(start, true);
  };

  const openRoom = async (code: string, host: boolean) => {
    if (!netAvailable()) {
      setLobbyMsg(tr('las salas en línea no están disponibles ahora.', 'online rooms are not available right now.'));
      return;
    }
    setJoining(true);
    setLobbyMsg(null);
    const me: Member = { id: meId.current, name: meName, hue: Math.floor(Math.random() * 360), spec: avatarStore.get(), host };
    const net = new RoyaleNet(code, me, {
      members: (l) => {
        setMembers(l);
        membersRef.current(l);
      },
      msg: (m) => msgRef.current(m),
      error: () => setLobbyMsg(tr('se perdió la conexión con la sala.', 'the connection to the room was lost.')),
    });
    msgRef.current = (m) => {
      if (m.k === 'start') startFromMsg(m.start, false);
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
          <p className="royale__kicker">{tr('sala', 'room')}</p>
          <h1 className="royale__code">{roomCode}</h1>
          <p className="royale__lead">{tr('comparte este código con tus amigos. cuando estén todos, quien creó la sala empieza; los huecos hasta 12 los llenan bots.', 'share this code with your friends. when everyone is in, the room creator starts; empty slots up to 12 are filled with bots.')}</p>
          <ul className="royale__roster">
            {members.map((x) => <li key={x.id}><i style={{ background: `hsl(${x.hue} 80% 62%)` }} />{x.name}{x.host ? ` · ${tr('anfitrión', 'host')}` : ''}{x.id === meId.current && x.name !== tr('tú', 'you') ? ` · ${tr('tú', 'you')}` : ''}</li>)}
          </ul>
          <small>{members.length} {tr('de 12 jugadores', 'of 12 players')} · {12 - members.length} {tr('bots completarán', 'bots will fill in')}</small>
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
          <p className="royale__kicker">frutiger aero</p>
          <h1>aero royale</h1>
          <p className="royale__lead">{tr('12 orbes de cristal, una isla que se encoge. la opacidad gris avanza: revienta burbujas, haz clic rápido para cargar el frenesí y sé el último en pie.', '12 glass orbs, one shrinking island. the gray haze closes in: pop bubbles, click fast to charge frenzy and be the last one standing.')}</p>
          <div className="royale__actions">
            <button type="button" className="vista-button vista-button--primary" onClick={startSolo}>{tr('jugar contra 11 bots', 'play vs 11 bots')}</button>
            <button type="button" className="vista-button" onClick={() => setHelp((v) => !v)} aria-expanded={help}>{tr('cómo se juega', 'how to play')}</button>
            <a className="landing__text-link" href={routeHref('inicio')}>{tr('volver', 'back')}</a>
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
              <li><b>{tr('mover', 'move')}</b> {touch ? tr('joystick a la izquierda', 'left joystick') : 'W A S D / ←↑↓→'}</li>
              <li><b>{tr('disparar', 'shoot')}</b> {touch ? tr('botón de burbuja (apunta solo al rival cercano)', 'bubble button (auto-aims at nearby rivals)') : tr('clic o espacio, apunta con el ratón', 'click or space, aim with the mouse')}</li>
              <li><b>{tr('objetos', 'pickups')}</b> ♥ {tr('vida', 'health')} · ◆ {tr('escudo', 'shield')} · » {tr('ráfaga', 'rapid fire')} · ≫ {tr('velocidad', 'speed')}</li>
              <li><b>{tr('la opacidad', 'the haze')}</b> {tr('fuera del círculo luminoso pierdes vida; fuera de la isla caes al lago', 'outside the glowing circle you lose health; outside the island you fall into the lake')}</li>
            </ul>
          )}
          <ProgressCard />
          <a className="landing__text-link" href="#/blob">{tr('probar otro modo: aero blob', 'try another mode: aero blob')}</a>
        </div>
      </main>
    );
  }

  return (
    <main className="royale royale--play" aria-label="aero royale">
      <canvas ref={canvasRef} className="royale__canvas" />
      <div className="royale__hud">
        <div className="royale__chips">
          <span><b>{hud.alive}</b> {tr('vivos', 'alive')}</span>
          <span><b>{hud.kills}</b> {tr('bajas', 'pops')}</span>
        </div>
        <div className="royale__zone">{hud.banner || hud.zone}</div>
        <canvas ref={miniRef} className="royale__mini" width={132} height={132} aria-hidden="true" />
        <ul className="royale__feed" aria-live="polite">{feed.map((f) => <li key={f.id}>{f.text}</li>)}</ul>
        <div className="royale__vitals">
          <div className="royale__bar"><i style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} /><span>{hud.hp} / {hud.maxHp}</span></div>
          {hud.shield > 0 && <div className="royale__bar royale__bar--shield"><i style={{ width: `${Math.min(100, (hud.shield / 60) * 100)}%` }} /><span>{hud.shield}</span></div>}
        </div>
        {!hud.dead && hud.count === 0 && (
          <div className="royale__frenzy" aria-label={tr('frenesí', 'frenzy')}>
            <div className={`royale__fbar${hud.rush ? ' is-rush' : ''}`}><i style={{ width: `${hud.frenzy}%` }} />{[25, 50, 75].map((t) => <u key={t} style={{ left: `${t}%` }} />)}</div>
            <small>{hud.rush ? 'AERO RUSH' : hud.triple ? tr('ráfaga triple', 'triple shot') : hud.frenzy >= 25 ? tr('clics rápidos = más velocidad y daño', 'fast clicks = more speed and damage') : tr('haz clic rápido para cargar el frenesí', 'click fast to charge frenzy')}</small>
          </div>
        )}
        {hud.combo >= 2 && !hud.dead && <div className="royale__combo" style={{ ['--k' as string]: hud.comboLeft / 1.8 }}><b>x{hud.combo}</b><span>{tr('combo', 'combo')}</span></div>}
        {hud.count > 0 && <div className="royale__count" aria-live="assertive">{hud.count}</div>}
        {hud.dead && (
          <div className="royale__dead" role="status">
            <strong>{tr('te reventaron', 'you were popped')} · {tr('puesto', 'place')} {hud.place}</strong>
            <span>{tr('mirando la partida', 'spectating')}</span>
            <button type="button" className="vista-button" onClick={() => { const fn = (window as unknown as { __royaleSpeed?: (n: number) => void }).__royaleSpeed; fn?.(5); }}>{tr('acelerar', 'fast forward')}</button>
          </div>
        )}
        <div id="royale-stick" ref={stickRef} className="royale__stick" aria-hidden="true"><i /></div>
        {touch && !hud.dead && <button id="royale-fire" type="button" className="royale__fire" aria-label={tr('disparar burbuja', 'shoot bubble')}>◯</button>}
        <button type="button" className="royale__exit vista-button" onClick={() => { runId.current++; setPhase('menu'); }}>{tr('salir', 'exit')}</button>
      </div>
    </main>
  );
}

