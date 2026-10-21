/**
 * aero royale: simulación pura (sin dibujo ni red) de la batalla.
 * doce orbes de cristal en una isla que se encoge: la "opacidad" gris avanza y quien queda fuera pierde vida.
 * todo lo que no es entrada de las personas sale de la semilla, así la zona y los objetos coinciden en una partida en línea.
 */
import { mulberry32 } from '../minigames/rng';

export const ARENA_R = 1000;
export const PLAYER_R = 24;
export const BULLET_R = 9;
export const BULLET_SPEED = 560;
export const BULLET_LIFE = 0.85;
export const BULLET_DMG = 10;
export const MAX_HP = 160;
export const MOVE_SPEED = 240;
export const BOOST_SPEED = 320;
export const FIRE_CD = 0.4;
export const RAPID_CD = 0.19;

/** fases de la zona: [hasta qué segundo, radio al terminar]; entre fases se encoge y al final se mantiene. */
export const ZONE_PLAN: ReadonlyArray<{ hold: number; shrink: number; radius: number; dps: number }> = [
  { hold: 14, shrink: 26, radius: 720, dps: 5 },
  { hold: 14, shrink: 24, radius: 450, dps: 8 },
  { hold: 12, shrink: 22, radius: 220, dps: 12 },
  { hold: 10, shrink: 22, radius: 50, dps: 18 },
];

export type PickupKind = 'heart' | 'shield' | 'rapid' | 'speed';

export interface Player {
  id: string;
  name: string;
  hue: number;
  isBot: boolean;
  /** quién manda sobre este jugador en esta máquina: puede mover, disparar y recibir daño aquí. */
  auth: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  aim: number;
  hp: number;
  shield: number;
  alive: boolean;
  kills: number;
  cd: number;
  rapid: number;
  speed: number;
  placement: number;
  /** solo bots: temporizador y objetivo del pensamiento. */
  think: number;
  tx: number;
  ty: number;
  strafe: number;
  skill: number;
  /** solo bots: dispara en ráfagas, no sin parar. */
  trig: boolean;
}

export interface Bullet {
  id: number;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface Pickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
}

export interface Input {
  mx: number;
  my: number;
  aim: number;
  fire: boolean;
}

export type RoyaleEvent =
  | { type: 'shot'; bullet: Bullet }
  | { type: 'hit'; victim: string; killer: string; dmg: number; dead: boolean }
  | { type: 'pickup'; player: string; kind: PickupKind; id: number }
  | { type: 'fall'; player: string }
  | { type: 'phase'; phase: number }
  | { type: 'end'; winner: string | null };

export interface Match {
  seed: number;
  t: number;
  players: Player[];
  bullets: Bullet[];
  pickups: Pickup[];
  nextId: number;
  phase: number;
  over: boolean;
  winner: string | null;
  rnd: () => number;
  /** generador solo para los objetos y su numeración: igual en todas las máquinas de una partida en línea. */
  prnd: () => number;
  pid: number;
  nextPickup: number;
  /** hora de la última baja, para el aviso de "quedan N". */
  deaths: number;
}

export interface PlayerInit {
  id: string;
  name: string;
  isBot: boolean;
  auth: boolean;
  hue: number;
  skill?: number;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** radio de la zona segura en el segundo t y la fase en curso. */
export function zoneAt(t: number): { radius: number; phase: number; dps: number; shrinking: boolean; next: number } {
  let start = 0;
  let from = ARENA_R;
  for (let i = 0; i < ZONE_PLAN.length; i++) {
    const p = ZONE_PLAN[i];
    const holdEnd = start + p.hold;
    const shrinkEnd = holdEnd + p.shrink;
    if (t < holdEnd) return { radius: from, phase: i, dps: p.dps, shrinking: false, next: holdEnd - t };
    if (t < shrinkEnd) {
      const k = (t - holdEnd) / p.shrink;
      const eased = k * k * (3 - 2 * k);
      return { radius: from + (p.radius - from) * eased, phase: i, dps: p.dps, shrinking: true, next: shrinkEnd - t };
    }
    start = shrinkEnd;
    from = p.radius;
  }
  return { radius: from, phase: ZONE_PLAN.length, dps: ZONE_PLAN[ZONE_PLAN.length - 1].dps + 6, shrinking: false, next: 0 };
}

/** el centro de la zona se desplaza un poco en cada fase, para que no siempre sea el mismo punto. */
export function zoneCenter(seed: number, phase: number): { x: number; y: number } {
  if (phase <= 0) return { x: 0, y: 0 };
  const r = mulberry32(seed + phase * 7919);
  const a = r() * Math.PI * 2;
  const d = r() * 110 * phase;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}

function makePlayer(init: PlayerInit, i: number, n: number, rnd: () => number): Player {
  const a = (i / n) * Math.PI * 2 + rnd() * 0.2;
  const d = ARENA_R * (0.8 + rnd() * 0.12);
  return {
    id: init.id, name: init.name, hue: init.hue, isBot: init.isBot, auth: init.auth,
    x: Math.cos(a) * d, y: Math.sin(a) * d, vx: 0, vy: 0, aim: a + Math.PI,
    hp: MAX_HP, shield: 0, alive: true, kills: 0, cd: 1.2 + rnd(), rapid: 0, speed: 0, placement: 0,
    think: rnd() * 0.3, tx: 0, ty: 0, strafe: rnd() < 0.5 ? 1 : -1, trig: false, skill: init.skill ?? 0.35 + rnd() * 0.35,
  };
}

export function createMatch(seed: number, inits: PlayerInit[]): Match {
  const rnd = mulberry32(seed);
  const players = inits.map((p, i) => makePlayer(p, i, inits.length, rnd));
  const m: Match = { seed, t: 0, players, bullets: [], pickups: [], nextId: 1, phase: 0, over: false, winner: null, rnd, prnd: mulberry32(seed ^ 0x5bd1e995), pid: 1, nextPickup: 5, deaths: 0 };
  const kinds: PickupKind[] = ['heart', 'shield', 'rapid', 'speed'];
  for (let i = 0; i < 16; i++) {
    const a = m.prnd() * Math.PI * 2;
    const d = Math.sqrt(m.prnd()) * (ARENA_R - 90);
    m.pickups.push({ id: m.pid++, kind: kinds[i % 4], x: Math.cos(a) * d, y: Math.sin(a) * d });
  }
  return m;
}

export function alive(m: Match): Player[] {
  return m.players.filter((p) => p.alive);
}

export function spawnBullet(m: Match, owner: Player, aim: number, id?: number): Bullet {
  const b: Bullet = {
    id: id ?? m.nextId++, owner: owner.id,
    x: owner.x + Math.cos(aim) * (PLAYER_R + 4), y: owner.y + Math.sin(aim) * (PLAYER_R + 4),
    vx: Math.cos(aim) * BULLET_SPEED, vy: Math.sin(aim) * BULLET_SPEED, life: BULLET_LIFE,
  };
  m.bullets.push(b);
  return b;
}

/** daño a un jugador local: escudo primero, retroceso y baja si se acaba la vida. devuelve el evento. */
export function damage(m: Match, victim: Player, killerId: string, dmg: number, kx = 0, ky = 0): RoyaleEvent | null {
  if (!victim.alive) return null;
  let left = dmg;
  if (victim.shield > 0) {
    const absorbed = Math.min(victim.shield, left);
    victim.shield -= absorbed;
    left -= absorbed;
  }
  victim.hp -= left;
  victim.vx += kx;
  victim.vy += ky;
  const dead = victim.hp <= 0;
  if (dead) eliminate(m, victim, killerId);
  return { type: 'hit', victim: victim.id, killer: killerId, dmg, dead };
}

export function eliminate(m: Match, victim: Player, killerId: string | null) {
  if (!victim.alive) return;
  victim.alive = false;
  victim.hp = 0;
  victim.placement = alive(m).length + 1;
  m.deaths++;
  const killer = killerId ? m.players.find((p) => p.id === killerId) : undefined;
  if (killer && killer.id !== victim.id) killer.kills++;
}

function applyPickup(p: Player, kind: PickupKind) {
  if (kind === 'heart') p.hp = Math.min(MAX_HP, p.hp + 45);
  if (kind === 'shield') p.shield = Math.min(60, p.shield + 40);
  if (kind === 'rapid') p.rapid = 9;
  if (kind === 'speed') p.speed = 8;
}

/** pensamiento de un bot: elige hacia dónde ir y si dispara. */
function botInput(m: Match, b: Player, dt: number, z: { radius: number }, c: { x: number; y: number }): Input {
  b.think -= dt;
  const enemies = m.players.filter((p) => p.alive && p.id !== b.id);
  let target: Player | null = null;
  let best = Infinity;
  for (const e of enemies) {
    const d = dist(b.x, b.y, e.x, e.y);
    if (d < best) { best = d; target = e; }
  }
  if (b.think <= 0) {
    b.think = 0.25 + m.rnd() * 0.35;
    if (m.rnd() < 0.3) b.strafe *= -1;
    b.trig = m.rnd() < 0.42;
    const outside = dist(b.x, b.y, c.x, c.y) > z.radius - 70;
    let goal: { x: number; y: number } | null = null;
    if (outside) goal = { x: c.x + (m.rnd() - 0.5) * 120, y: c.y + (m.rnd() - 0.5) * 120 };
    else {
      const want: PickupKind[] = b.hp < 55 ? ['heart', 'shield'] : ['shield', 'rapid', 'speed', 'heart'];
      let bestPick: Pickup | null = null;
      let bd = 520;
      for (const k of m.pickups) {
        if (!want.includes(k.kind) || dist(k.x, k.y, c.x, c.y) > z.radius - 30) continue;
        const d = dist(b.x, b.y, k.x, k.y);
        if (d < bd) { bd = d; bestPick = k; }
      }
      if (bestPick && (!target || best > 330)) goal = { x: bestPick.x, y: bestPick.y };
    }
    if (!goal && target) goal = best > 300 ? { x: target.x, y: target.y } : null;
    if (!goal) goal = { x: c.x, y: c.y };
    b.tx = goal.x;
    b.ty = goal.y;
  }
  let mx = b.tx - b.x;
  let my = b.ty - b.y;
  const len = Math.hypot(mx, my) || 1;
  mx /= len;
  my /= len;
  let aim = b.aim;
  let fire = false;
  // al principio los bots buscan objetos y solo pelean si alguien se les echa encima
  const engage = m.t > 30 ? 380 : 190;
  if (target && best < engage) {
    const lead = (best / BULLET_SPEED) * 0.55;
    const ax = target.x + target.vx * lead - b.x;
    const ay = target.y + target.vy * lead - b.y;
    const err = (1 - b.skill) * 1.2 * (m.rnd() - 0.5) * 2;
    aim = Math.atan2(ay, ax) + err;
    fire = b.trig;
    if (best < 300) {
      // a corta distancia gira alrededor del rival en vez de ir de frente
      mx = -Math.sin(aim) * b.strafe;
      my = Math.cos(aim) * b.strafe;
    }
  } else if (len > 1) aim = Math.atan2(my, mx);
  return { mx: mx * 0.92, my: my * 0.92, aim, fire };
}

/** avanza la partida dt segundos. `inputs` trae las entradas de los jugadores humanos locales. */
export function step(m: Match, dt: number, inputs: Record<string, Input>): RoyaleEvent[] {
  const events: RoyaleEvent[] = [];
  if (m.over) return events;
  m.t += dt;
  const z = zoneAt(m.t);
  const c = zoneCenter(m.seed, z.phase);
  if (z.phase !== m.phase) {
    m.phase = z.phase;
    events.push({ type: 'phase', phase: z.phase });
  }

  for (const p of m.players) {
    if (p.alive && !p.auth) {
      // jugador de otra máquina: se acerca suavemente a la última posición que anunció
      const k = Math.min(1, dt * 12);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    }
    if (!p.alive || !p.auth) continue;
    const inp = p.isBot ? botInput(m, p, dt, z, c) : inputs[p.id] ?? { mx: 0, my: 0, aim: p.aim, fire: false };
    const sp = p.speed > 0 ? BOOST_SPEED : MOVE_SPEED;
    const len = Math.hypot(inp.mx, inp.my);
    const dx = len > 1 ? inp.mx / len : inp.mx;
    const dy = len > 1 ? inp.my / len : inp.my;
    const k = 1 - Math.exp(-10 * dt);
    p.vx += (dx * sp - p.vx) * k;
    p.vy += (dy * sp - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.aim = inp.aim;
    p.cd = Math.max(0, p.cd - dt);
    p.rapid = Math.max(0, p.rapid - dt);
    p.speed = Math.max(0, p.speed - dt);
    if (inp.fire && p.cd <= 0) {
      p.cd = (p.rapid > 0 ? RAPID_CD : FIRE_CD) * (p.isBot ? 2.1 : 1);
      events.push({ type: 'shot', bullet: spawnBullet(m, p, p.aim) });
    }
    // fuera de la zona: la opacidad hace daño; fuera de la isla: cae al lago
    if (dist(p.x, p.y, c.x, c.y) > z.radius) {
      const ev = damage(m, p, 'zona', z.dps * dt);
      if (ev?.type === 'hit' && ev.dead) events.push(ev);
    }
    if (p.alive && Math.hypot(p.x, p.y) > ARENA_R + 70) {
      eliminate(m, p, null);
      events.push({ type: 'fall', player: p.id });
    }
    // recoger objetos
    for (let i = m.pickups.length - 1; i >= 0; i--) {
      const k = m.pickups[i];
      if (p.alive && dist(p.x, p.y, k.x, k.y) < PLAYER_R + 16) {
        applyPickup(p, k.kind);
        m.pickups.splice(i, 1);
        events.push({ type: 'pickup', player: p.id, kind: k.kind, id: k.id });
      }
    }
  }

  // burbujas: avanzan y chocan con quien mande en la máquina que simula ese impacto
  for (let i = m.bullets.length - 1; i >= 0; i--) {
    const b = m.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let used = b.life <= 0 || Math.hypot(b.x, b.y) > ARENA_R + 200;
    if (!used) {
      for (const p of m.players) {
        if (!p.alive || p.id === b.owner || dist(b.x, b.y, p.x, p.y) > PLAYER_R + BULLET_R) continue;
        used = true;
        if (p.auth) {
          const ev = damage(m, p, b.owner, BULLET_DMG, (b.vx / BULLET_SPEED) * 150, (b.vy / BULLET_SPEED) * 150);
          if (ev) events.push(ev);
        }
        break;
      }
    }
    if (used) m.bullets.splice(i, 1);
  }

  // objetos nuevos dentro de la zona
  m.nextPickup -= dt;
  if (m.nextPickup <= 0 && m.pickups.length < 18) {
    m.nextPickup = 7 + m.prnd() * 3;
    const kinds: PickupKind[] = ['heart', 'shield', 'rapid', 'speed'];
    const a = m.prnd() * Math.PI * 2;
    const d = Math.sqrt(m.prnd()) * Math.max(60, z.radius - 60);
    m.pickups.push({ id: m.pid++, kind: kinds[Math.floor(m.prnd() * 4)], x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d });
  }

  const left = alive(m);
  if (left.length <= 1 && !m.over) {
    m.over = true;
    m.winner = left[0]?.id ?? null;
    if (left[0]) left[0].placement = 1;
    events.push({ type: 'end', winner: m.winner });
  }
  return events;
}
