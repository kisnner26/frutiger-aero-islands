/** paintball royale: simulación pura (sin dibujo ni red). la arena es un círculo, la zona segura se encoge y quien queda en pie gana. */
import { mulberry32 } from '../minigames/rng';

export const ARENA_R = 520;
export const MAX_HP = 3;
export const MAX_AMMO = 12;
export const FIRE_CD = 0.34;
export const RELOAD_TIME = 1.5;
export const RANGE = 760;
export const BODY_R = 17;
export const WALK = 150;
export const TURN_BOT = 3.2;

export interface Input {
  fwd: number;
  strafe: number;
  fire: boolean;
  reload: boolean;
}

export interface Player {
  id: string;
  name: string;
  hue: number;
  isBot: boolean;
  x: number;
  y: number;
  /** 0 mira al norte (−y); crece en sentido horario. */
  heading: number;
  hp: number;
  alive: boolean;
  ammo: number;
  reload: number;
  cd: number;
  kills: number;
  placement: number;
  /** tiempo desde el último impacto recibido (para el destello). */
  hurt: number;
  /** destello del disparo propio. */
  flash: number;
  ai: { wx: number; wy: number; think: number; strafe: number; flip: number; aimErr: number; acc: number };
}

export interface Obstacle {
  x: number;
  y: number;
  r: number;
  /** alto dibujado en unidades del mundo. */
  h: number;
  kind: string;
}

export type PbEvent =
  | { k: 'shot'; id: string; x: number; y: number; heading: number }
  | { k: 'hit'; victim: string; killer: string; dead: boolean }
  | { k: 'splat'; x: number; y: number; hue: number }
  | { k: 'zone'; id: string };

export interface Match {
  seed: number;
  t: number;
  players: Player[];
  obstacles: Obstacle[];
  over: boolean;
  winner: string | null;
  events: PbEvent[];
  /** impactos recién producidos por esta máquina, por aplicar. */
  hits: Array<{ victim: string; killer: string }>;
  /** daño de la zona acumulado por jugador (fracciones de punto de vida). */
  zoneAcc: Record<string, number>;
  /** a quién le toca el siguiente puesto al caer (el último en pie es el 1.º). */
  alive: number;
}

export interface PlayerInit {
  id: string;
  name: string;
  hue: number;
  isBot: boolean;
}

const OBSTACLE_KINDS: Array<[string, number, number]> = [
  ['palmera', 20, 190], ['arbol', 26, 170], ['roca', 24, 100], ['cristal', 18, 140], ['casita', 46, 190], ['estatua', 26, 170], ['gota', 28, 160], ['arbol_cristal', 30, 190],
];

/** obstáculos que sirven de cobertura, repartidos sin amontonarse. misma semilla, misma arena. */
export function genObstacles(seed: number, count = 46): Obstacle[] {
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const out: Obstacle[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * (ARENA_R - 150); // la orilla queda libre para que nadie salga pegado a un árbol
    const [kind, r, h] = OBSTACLE_KINDS[Math.floor(rnd() * OBSTACLE_KINDS.length)];
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    if (d < 30) continue; // el centro queda libre
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 34)) continue;
    out.push({ x, y, r, h, kind });
  }
  return out;
}

const KEYFRAMES: Array<[number, number]> = [[0, 520], [28, 520], [52, 350], [76, 350], [100, 200], [124, 200], [150, 85], [176, 85], [205, 28], [400, 28]];

export interface Zone {
  x: number;
  y: number;
  r: number;
  phase: number;
  /** segundos hasta que empiece a cerrarse (0 si ya se está cerrando). */
  hold: number;
  closing: boolean;
}

export function zoneAt(t: number, seed: number): Zone {
  const rnd = mulberry32(seed ^ 0x9e3779b1);
  const fa = rnd() * Math.PI * 2;
  const fd = rnd() * 170;
  const fx = Math.cos(fa) * fd;
  const fy = Math.sin(fa) * fd;
  let r = KEYFRAMES[KEYFRAMES.length - 1][1];
  let phase = KEYFRAMES.length - 1;
  let hold = 0;
  let closing = false;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const [t0, r0] = KEYFRAMES[i];
    const [t1, r1] = KEYFRAMES[i + 1];
    if (t >= t0 && t < t1) {
      r = r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
      phase = i;
      closing = r1 < r0;
      hold = closing ? 0 : t1 - t;
      break;
    }
  }
  // el centro se acerca al punto final a medida que el radio baja
  const k = 1 - (r - 28) / (ARENA_R - 28);
  return { x: fx * k, y: fy * k, r, phase, hold, closing };
}

/** puestos de salida repartidos por igual en la orilla; el orden de la lista de jugadores es el mismo en todas las máquinas. */
export function spawnPoint(index: number, count: number, seed: number): { x: number; y: number; heading: number } {
  const offset = mulberry32(seed ^ 0x3c6ef372)() * Math.PI * 2;
  const a = offset + (index / Math.max(1, count)) * Math.PI * 2;
  const x = Math.cos(a) * (ARENA_R - 90);
  const y = Math.sin(a) * (ARENA_R - 90);
  return { x, y, heading: Math.atan2(-x, y) }; // mira al centro
}

export function createMatch(seed: number, inits: PlayerInit[]): Match {
  const obstacles = genObstacles(seed);
  const players: Player[] = inits.map((p, i) => {
    const s = spawnPoint(i, inits.length, seed);
    const rnd = mulberry32(seed + i * 977);
    return {
      id: p.id, name: p.name, hue: p.hue, isBot: p.isBot, x: s.x, y: s.y, heading: s.heading, hp: MAX_HP, alive: true, ammo: MAX_AMMO, reload: 0, cd: 0.6, kills: 0, placement: 0, hurt: 9, flash: 0,
      ai: { wx: 0, wy: 0, think: rnd() * 1.2, strafe: 1, flip: 1 + rnd() * 2, aimErr: 0.03 + rnd() * 0.07, acc: 0.55 + rnd() * 0.3 },
    };
  });
  return { seed, t: 0, players, obstacles, over: false, winner: null, events: [], hits: [], zoneAcc: {}, alive: players.length };
}

export const dirOf = (h: number) => ({ x: Math.sin(h), y: -Math.cos(h) });
export const rightOf = (h: number) => ({ x: Math.cos(h), y: Math.sin(h) });

/** empuja a (x, y) fuera de los obstáculos y dentro de la arena. */
export function collide(m: Match, x: number, y: number): { x: number; y: number } {
  for (const o of m.obstacles) {
    const d = Math.hypot(x - o.x, y - o.y);
    const min = o.r * 0.8 + BODY_R;
    if (d < min && d > 0.001) {
      x = o.x + ((x - o.x) / d) * min;
      y = o.y + ((y - o.y) / d) * min;
    }
  }
  const dc = Math.hypot(x, y);
  const lim = ARENA_R + 30;
  if (dc > lim) {
    x = (x / dc) * lim;
    y = (y / dc) * lim;
  }
  return { x, y };
}

/** primera cosa que toca un disparo: un jugador vivo, un obstáculo o nada. */
export function castShot(m: Match, shooter: Player, heading: number): { victim: Player | null; depth: number; x: number; y: number } {
  const d = dirOf(heading);
  let best = RANGE;
  let victim: Player | null = null;
  for (const o of m.obstacles) {
    const t = rayCircle(shooter.x, shooter.y, d.x, d.y, o.x, o.y, o.r * 0.85);
    if (t !== null && t < best) {
      best = t;
      victim = null;
    }
  }
  for (const p of m.players) {
    if (!p.alive || p.id === shooter.id) continue;
    const t = rayCircle(shooter.x, shooter.y, d.x, d.y, p.x, p.y, BODY_R + 3);
    if (t !== null && t < best) {
      best = t;
      victim = p;
    }
  }
  return { victim, depth: best, x: shooter.x + d.x * best, y: shooter.y + d.y * best };
}

function rayCircle(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, r: number): number | null {
  const fx = cx - ox;
  const fy = cy - oy;
  const proj = fx * dx + fy * dy;
  if (proj < 0) return null;
  const perp2 = fx * fx + fy * fy - proj * proj;
  if (perp2 > r * r) return null;
  return Math.max(0, proj - Math.sqrt(r * r - perp2));
}

/** dispara (si puede). devuelve el impacto para que quien manda sobre la víctima lo aplique. */
export function fire(m: Match, p: Player, rnd: () => number = Math.random): { victim: Player | null; x: number; y: number } | null {
  if (!p.alive || p.cd > 0 || p.reload > 0 || p.ammo <= 0 || m.over) return null;
  p.ammo--;
  p.cd = FIRE_CD;
  p.flash = 0.12;
  if (p.ammo === 0) p.reload = RELOAD_TIME;
  const spread = (rnd() - 0.5) * 0.03;
  const shot = castShot(m, p, p.heading + spread);
  m.events.push({ k: 'shot', id: p.id, x: p.x, y: p.y, heading: p.heading + spread });
  m.events.push({ k: 'splat', x: shot.x, y: shot.y, hue: p.hue });
  return { victim: shot.victim, x: shot.x, y: shot.y };
}

/** aplica un impacto de pintura. devuelve true si la víctima queda eliminada. */
export function registerHit(m: Match, victimId: string, killerId: string): boolean {
  const v = m.players.find((p) => p.id === victimId);
  if (!v || !v.alive || m.over) return false;
  v.hp -= 1;
  v.hurt = 0;
  const dead = v.hp <= 0;
  m.events.push({ k: 'hit', victim: victimId, killer: killerId, dead });
  if (dead) eliminate(m, victimId, killerId);
  return dead;
}

export function eliminate(m: Match, victimId: string, killerId: string | null) {
  const v = m.players.find((p) => p.id === victimId);
  if (!v || !v.alive) return;
  v.alive = false;
  v.hp = 0;
  v.placement = m.alive;
  m.alive--;
  const k = killerId ? m.players.find((p) => p.id === killerId) : null;
  if (k && k !== v) k.kills++;
  if (m.alive <= 1) finishMatch(m);
}

function finishMatch(m: Match) {
  m.over = true;
  const w = m.players.find((p) => p.alive) ?? null;
  if (w) {
    w.placement = 1;
    m.winner = w.id;
  }
}

/** paso de la partida: movimiento, recarga, zona y bots. `inputs` trae las órdenes de quien se maneja en esta máquina. */
export function step(m: Match, dt: number, inputs: Record<string, Input>, controlBots: boolean, rnd: () => number = Math.random) {
  if (m.over) return;
  m.t += dt;
  const zone = zoneAt(m.t, m.seed);
  for (const p of m.players) {
    if (!p.alive) continue;
    p.cd = Math.max(0, p.cd - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.hurt += dt;
    if (p.reload > 0) {
      p.reload -= dt;
      if (p.reload <= 0) {
        p.reload = 0;
        p.ammo = MAX_AMMO;
      }
    }
    const inp = inputs[p.id];
    if (inp) {
      if (inp.reload && p.ammo < MAX_AMMO && p.reload <= 0) p.reload = RELOAD_TIME;
      moveBy(m, p, inp.fwd, inp.strafe, dt);
      if (inp.fire) {
        const hit = fire(m, p, rnd);
        if (hit?.victim) m.hits.push({ victim: hit.victim.id, killer: p.id });
      }
    }
    // la opacidad hace daño fuera de la zona segura
    const out = Math.hypot(p.x - zone.x, p.y - zone.y) - zone.r;
    if (out > 0) {
      const rate = 0.14 + zone.phase * 0.035;
      m.zoneAcc[p.id] = (m.zoneAcc[p.id] ?? 0) + dt * rate;
    }
  }
  if (controlBots) for (const p of m.players) if (p.isBot && p.alive) botStep(m, p, dt, zone, rnd);
}

/** recoge los impactos pendientes (los aplica quien manda sobre cada víctima). */
export function takeHits(m: Match): Array<{ victim: string; killer: string }> {
  return m.hits.splice(0, m.hits.length);
}

/** convierte el daño de zona acumulado en puntos de vida perdidos. devuelve a quién eliminó. */
export function applyZone(m: Match, ids: Iterable<string>): string[] {
  const dead: string[] = [];
  for (const id of ids) {
    const acc = m.zoneAcc[id] ?? 0;
    if (acc >= 1) {
      m.zoneAcc[id] = acc - 1;
      const v = m.players.find((p) => p.id === id);
      if (!v || !v.alive) continue;
      v.hp -= 1;
      v.hurt = 0;
      m.events.push({ k: 'hit', victim: id, killer: 'zona', dead: v.hp <= 0 });
      if (v.hp <= 0) {
        eliminate(m, id, null);
        dead.push(id);
      }
    }
  }
  return dead;
}

export function moveBy(m: Match, p: Player, fwd: number, strafe: number, dt: number) {
  const len = Math.hypot(fwd, strafe);
  if (len < 0.01) return;
  const k = Math.min(1, len) / len;
  const d = dirOf(p.heading);
  const r = rightOf(p.heading);
  const nx = p.x + (d.x * fwd + r.x * strafe) * k * WALK * dt;
  const ny = p.y + (d.y * fwd + r.y * strafe) * k * WALK * dt;
  const c = collide(m, nx, ny);
  p.x = c.x;
  p.y = c.y;
}

const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

/** inteligencia simple: busca el enemigo más cercano que pueda ver, apunta con algo de error y se mueve a cubierto o hacia la zona. */
function botStep(m: Match, b: Player, dt: number, zone: Zone, rnd: () => number) {
  const ai = b.ai;
  ai.think -= dt;
  ai.flip -= dt;
  if (ai.flip <= 0) {
    ai.strafe = rnd() < 0.5 ? -1 : 1;
    ai.flip = 0.8 + rnd() * 1.8;
  }
  let target: Player | null = null;
  let best = 460;
  for (const o of m.players) {
    if (!o.alive || o.id === b.id) continue;
    const d = Math.hypot(o.x - b.x, o.y - b.y);
    if (d < best) {
      const shot = castShot(m, b, Math.atan2(o.x - b.x, -(o.y - b.y)));
      if (shot.victim === o) {
        best = d;
        target = o;
      }
    }
  }
  const outside = Math.hypot(b.x - zone.x, b.y - zone.y) > zone.r - 40;
  if (target) {
    const want = Math.atan2(target.x - b.x, -(target.y - b.y)) + (rnd() - 0.5) * ai.aimErr * 2;
    const diff = angDiff(b.heading, want);
    b.heading += Math.max(-TURN_BOT * dt, Math.min(TURN_BOT * dt, diff));
    moveBy(m, b, best > 260 ? 0.5 : -0.1, ai.strafe * 0.8, dt);
    if (Math.abs(diff) < 0.12 && rnd() < dt * 3.2 * ai.acc) {
      const hit = fire(m, b, rnd);
      if (hit?.victim && rnd() < ai.acc + 0.2) m.hits.push({ victim: hit.victim.id, killer: b.id });
    }
  } else {
    if (ai.think <= 0 || outside) {
      ai.think = 1.5 + rnd() * 2.5;
      const a = rnd() * Math.PI * 2;
      const rr = Math.sqrt(rnd()) * Math.max(10, zone.r - 50);
      ai.wx = zone.x + Math.cos(a) * rr;
      ai.wy = zone.y + Math.sin(a) * rr;
    }
    const want = Math.atan2(ai.wx - b.x, -(ai.wy - b.y));
    b.heading += Math.max(-TURN_BOT * dt, Math.min(TURN_BOT * dt, angDiff(b.heading, want)));
    moveBy(m, b, 0.85, 0, dt);
    if (b.ammo < MAX_AMMO && b.reload <= 0 && rnd() < dt) b.reload = RELOAD_TIME;
  }
  if (b.ammo === 0 && b.reload <= 0) b.reload = RELOAD_TIME;
}

/** aviso para la interfaz: cuánto falta para que la zona cambie. */
export function zoneLabel(z: Zone): { closing: boolean; seconds: number } {
  return { closing: z.closing, seconds: Math.ceil(z.hold) };
}
