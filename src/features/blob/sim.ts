/**
 * aero blob: simulación pura de un royale al estilo "agar".
 * cada jugador controla una célula de cristal que crece comiendo burbujas y a las más pequeñas.
 * se puede dividir, soltar masa y usar poderes; la bruma gris cierra la arena y gana quien termina con más masa.
 */
import { mulberry32 } from '../minigames/rng';

export const ARENA = 2400;
export const MIN_RADIUS = 620;
export const ROUND_TIME = 240;
export const HAZE_START = 35;
export const HAZE_END = 205;
export const START_MASS = 30;
export const PELLETS = 430;
export const EAT_RATIO = 1.22;
export const MAX_CELLS = 8;
export const MERGE_TIME = 11;
export const radiusOf = (mass: number) => 4.2 * Math.sqrt(mass);
export const speedOf = (mass: number) => 340 / Math.pow(1 + mass / 220, 0.35);

export type PowerKind = 'dash' | 'shield' | 'magnet' | 'freeze' | 'burst' | 'feast';
export const POWERS: PowerKind[] = ['dash', 'shield', 'magnet', 'freeze', 'burst', 'feast'];

export interface Cell { id: number; owner: string; x: number; y: number; bx: number; by: number; mass: number; merge: number; nx?: number; ny?: number }
export interface Pellet { id: number; x: number; y: number; hue: number; mass: number; vx: number; vy: number }
export interface Jelly { id: number; x: number; y: number; mass: number }
export interface Pickup { id: number; x: number; y: number; kind: PowerKind }

export interface Blob {
  id: string;
  name: string;
  hue: number;
  isBot: boolean;
  alive: boolean;
  cells: Cell[];
  tx: number;
  ty: number;
  power: PowerKind | null;
  shield: number;
  magnet: number;
  dash: number;
  frozen: number;
  placement: number;
  eaten: number;
  /** solo bots */
  think: number;
  mood: number;
  skill: number;
}

export interface Input { tx: number; ty: number; split: boolean; eject: boolean; power: boolean }

export type BlobEvent =
  | { type: 'eat'; by: string; victim: string; mass: number; x: number; y: number }
  | { type: 'split'; by: string }
  | { type: 'pop'; by: string; x: number; y: number }
  | { type: 'power'; by: string; kind: PowerKind; x: number; y: number }
  | { type: 'pickup'; by: string; kind: PowerKind }
  | { type: 'death'; id: string; killer: string | null; placement: number }
  | { type: 'end'; winner: string | null };

export interface Match {
  seed: number;
  t: number;
  players: Blob[];
  pellets: Pellet[];
  ejected: Pellet[];
  jellies: Jelly[];
  pickups: Pickup[];
  nextId: number;
  rnd: () => number;
  over: boolean;
  winner: string | null;
  respawn: number;
}

export interface BlobInit { id: string; name: string; hue: number; isBot: boolean }

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

export function hazeRadius(t: number): number {
  if (t <= HAZE_START) return ARENA;
  if (t >= HAZE_END) return MIN_RADIUS;
  const k = (t - HAZE_START) / (HAZE_END - HAZE_START);
  return ARENA + (MIN_RADIUS - ARENA) * k;
}

export const totalMass = (b: Blob) => b.cells.reduce((s, c) => s + c.mass, 0);
export const center = (b: Blob) => {
  const m = totalMass(b) || 1;
  return { x: b.cells.reduce((s, c) => s + c.x * c.mass, 0) / m, y: b.cells.reduce((s, c) => s + c.y * c.mass, 0) / m };
};

function randomPoint(rnd: () => number, radius = ARENA - 60) {
  const a = rnd() * Math.PI * 2;
  const d = Math.sqrt(rnd()) * radius;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}

export function createMatch(seed: number, inits: BlobInit[]): Match {
  const rnd = mulberry32(seed);
  const m: Match = { seed, t: 0, players: [], pellets: [], ejected: [], jellies: [], pickups: [], nextId: 1, rnd, over: false, winner: null, respawn: 0 };
  inits.forEach((p, i) => {
    const a = (i / inits.length) * Math.PI * 2 + rnd() * 0.3;
    const d = ARENA * (0.45 + rnd() * 0.35);
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    m.players.push({
      ...p, alive: true, cells: [{ id: m.nextId++, owner: p.id, x, y, bx: 0, by: 0, mass: START_MASS, merge: 0 }],
      tx: x, ty: y, power: null, shield: 2.5, magnet: 0, dash: 0, frozen: 0, placement: 0, eaten: 0, think: rnd() * 0.3, mood: 0, skill: 0.5 + rnd() * 0.45,
    });
  });
  for (let i = 0; i < PELLETS; i++) m.pellets.push(newPellet(m));
  for (let i = 0; i < 14; i++) {
    const p = randomPoint(rnd, ARENA - 200);
    m.jellies.push({ id: m.nextId++, x: p.x, y: p.y, mass: 100 });
  }
  for (let i = 0; i < 12; i++) {
    const p = randomPoint(rnd, ARENA - 150);
    m.pickups.push({ id: m.nextId++, x: p.x, y: p.y, kind: POWERS[i % POWERS.length] });
  }
  return m;
}

function newPellet(m: Match): Pellet {
  const p = randomPoint(m.rnd, ARENA - 30);
  return { id: m.nextId++, x: p.x, y: p.y, hue: Math.floor(m.rnd() * 360), mass: 1, vx: 0, vy: 0 };
}

export const alive = (m: Match) => m.players.filter((p) => p.alive);

/** posición en la tabla: 1 es quien tiene más masa. */
export function ranking(m: Match): Blob[] {
  return [...m.players].filter((p) => p.alive).sort((a, b) => totalMass(b) - totalMass(a));
}

function splitCells(m: Match, b: Blob, ev: BlobEvent[]) {
  const next: Cell[] = [];
  for (const c of b.cells) {
    if (c.mass < 36 || b.cells.length + next.length >= MAX_CELLS) {
      next.push(c);
      continue;
    }
    const half = c.mass / 2;
    c.mass = half;
    c.merge = m.t + MERGE_TIME + half * 0.01;
    const dx = b.tx - c.x;
    const dy = b.ty - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const sp = 640;
    next.push(c, { id: m.nextId++, owner: b.id, x: c.x + (dx / len) * radiusOf(half), y: c.y + (dy / len) * radiusOf(half), bx: (dx / len) * sp, by: (dy / len) * sp, mass: half, merge: c.merge });
  }
  b.cells = next;
  ev.push({ type: 'split', by: b.id });
}

function ejectMass(m: Match, b: Blob) {
  for (const c of b.cells) {
    if (c.mass < 36) continue;
    const dx = b.tx - c.x;
    const dy = b.ty - c.y;
    const len = Math.hypot(dx, dy) || 1;
    c.mass -= 12;
    const r = radiusOf(c.mass);
    m.ejected.push({ id: m.nextId++, x: c.x + (dx / len) * (r + 8), y: c.y + (dy / len) * (r + 8), hue: b.hue, mass: 11, vx: (dx / len) * 640, vy: (dy / len) * 640 });
  }
}

function usePower(m: Match, b: Blob, ev: BlobEvent[]) {
  const kind = b.power;
  if (!kind || !b.alive) return;
  b.power = null;
  const c = center(b);
  if (kind === 'dash') b.dash = 2.2;
  else if (kind === 'shield') b.shield = 6;
  else if (kind === 'magnet') b.magnet = 7;
  else if (kind === 'feast') for (const cell of b.cells) cell.mass *= 1.18;
  else if (kind === 'freeze') {
    for (const o of m.players) {
      if (o === b || !o.alive) continue;
      const oc = center(o);
      if (dist(c.x, c.y, oc.x, oc.y) < 700) o.frozen = 3.5;
    }
  } else if (kind === 'burst') {
    // anillo de burbujas de masa: sirve de cebo y de metralla (empuja a quien está cerca)
    const total = totalMass(b);
    const take = Math.min(total * 0.12, 90);
    const n = 10;
    for (const cell of b.cells) cell.mass -= (take * cell.mass) / total;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      m.ejected.push({ id: m.nextId++, x: c.x + Math.cos(a) * 40, y: c.y + Math.sin(a) * 40, hue: b.hue, mass: take / n, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520 });
    }
  }
  ev.push({ type: 'power', by: b.id, kind, x: c.x, y: c.y });
}

/** pensamiento de un bot: huye de los mayores, persigue a los menores, busca comida y usa poderes. */
function botInput(m: Match, b: Blob, dt: number): Input {
  const prev: Input = { tx: b.tx, ty: b.ty, split: false, eject: false, power: false };
  b.think -= dt;
  if (b.think > 0 || !b.cells.length) return prev;
  b.think = 0.18 + m.rnd() * 0.22;
  const c = center(b);
  const mass = totalMass(b);
  const big = b.cells.reduce((best, cell) => (cell.mass > best.mass ? cell : best), b.cells[0]);
  const r = radiusOf(big.mass);
  let fx = 0;
  let fy = 0;
  let threat = 0;
  let prey: { x: number; y: number; d: number; mass: number } | null = null;
  for (const o of m.players) {
    if (o === b || !o.alive) continue;
    for (const oc of o.cells) {
      const d = dist(c.x, c.y, oc.x, oc.y);
      if (d > 900 + r) continue;
      if (oc.mass > big.mass * EAT_RATIO && o.frozen <= 0) {
        const w = Math.min(3, 700 / Math.max(60, d - radiusOf(oc.mass)));
        fx += ((c.x - oc.x) / (d || 1)) * w;
        fy += ((c.y - oc.y) / (d || 1)) * w;
        threat = Math.max(threat, w);
      } else if (big.mass > oc.mass * (EAT_RATIO + 0.08) && (!prey || d < prey.d) && b.skill > 0.35) {
        prey = { x: oc.x, y: oc.y, d, mass: oc.mass };
      }
    }
  }
  const haze = hazeRadius(m.t);
  let tx = c.x;
  let ty = c.y;
  if (dist(c.x, c.y, 0, 0) > haze - 160) {
    tx = (m.rnd() - 0.5) * 200;
    ty = (m.rnd() - 0.5) * 200;
  } else if (threat > 0.5) {
    tx = c.x + fx * 400;
    ty = c.y + fy * 400;
    if (threat > 1.4 && b.power === 'shield') return { tx, ty, split: false, eject: false, power: true };
    if (threat > 1.2 && b.power === 'dash') return { tx, ty, split: false, eject: false, power: true };
  } else if (prey) {
    tx = prey.x;
    ty = prey.y;
    const wantSplit = prey.d < r * 3 && big.mass > prey.mass * 2.7 && b.cells.length < 3 && mass > 90 && m.rnd() < 0.5 * b.skill;
    const pw = b.power;
    const power = pw === 'dash' && prey.d < r * 6 ? true : pw === 'freeze' && prey.d < 500 ? true : pw === 'feast' && mass > 80;
    return { tx, ty, split: wantSplit, eject: false, power };
  } else {
    // comida: el cúmulo de burbujas más cercano
    let best: Pellet | null = null;
    let bd = 520;
    for (const p of m.pellets) {
      const d = dist(c.x, c.y, p.x, p.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    let pick: Pickup | null = null;
    let pd = 650;
    if (!b.power) {
      for (const k of m.pickups) {
        const d = dist(c.x, c.y, k.x, k.y);
        if (d < pd) {
          pd = d;
          pick = k;
        }
      }
    }
    if (pick) {
      tx = pick.x;
      ty = pick.y;
    } else if (best) {
      tx = best.x;
      ty = best.y;
    } else {
      b.mood = (b.mood + (m.rnd() - 0.5)) % (Math.PI * 2);
      tx = c.x + Math.cos(b.mood) * 500;
      ty = c.y + Math.sin(b.mood) * 500;
    }
  }
  return { tx, ty, split: false, eject: false, power: b.power === 'magnet' || (b.power === 'burst' && mass > 150 && m.rnd() < 0.2) };
}

function killPlayer(m: Match, b: Blob, killer: string | null, ev: BlobEvent[]) {
  if (!b.alive) return;
  b.alive = false;
  b.cells = [];
  b.placement = alive(m).length + 1;
  ev.push({ type: 'death', id: b.id, killer, placement: b.placement });
}

/** avanza dt segundos; `inputs` trae las órdenes de los humanos locales. */
export function step(m: Match, dt: number, inputs: Record<string, Input>): BlobEvent[] {
  const ev: BlobEvent[] = [];
  if (m.over) return ev;
  m.t += dt;
  const haze = hazeRadius(m.t);

  for (const b of m.players) {
    if (!b.alive) continue;
    const inp = b.isBot ? botInput(m, b, dt) : inputs[b.id] ?? { tx: b.tx, ty: b.ty, split: false, eject: false, power: false };
    b.tx = inp.tx;
    b.ty = inp.ty;
    if (inp.split) splitCells(m, b, ev);
    if (inp.eject) ejectMass(m, b);
    if (inp.power) usePower(m, b, ev);
    b.shield = Math.max(0, b.shield - dt);
    b.magnet = Math.max(0, b.magnet - dt);
    b.dash = Math.max(0, b.dash - dt);
    b.frozen = Math.max(0, b.frozen - dt);
  }

  // movimiento
  for (const b of m.players) {
    if (!b.alive) continue;
    const slow = b.frozen > 0 ? 0.4 : 1;
    const fast = b.dash > 0 ? 2.1 : 1;
    for (const c of b.cells) {
      const dx = b.tx - c.x;
      const dy = b.ty - c.y;
      const len = Math.hypot(dx, dy);
      const sp = speedOf(c.mass) * slow * fast * Math.min(1, len / Math.max(30, radiusOf(c.mass)));
      c.x += (len > 1 ? (dx / len) * sp : 0) * dt + c.bx * dt;
      c.y += (len > 1 ? (dy / len) * sp : 0) * dt + c.by * dt;
      const decay = Math.exp(-5 * dt);
      c.bx *= decay;
      c.by *= decay;
      if (c.mass > 200) c.mass -= c.mass * 0.0006 * dt * (c.mass > 1500 ? 2 : 1);
      // pared de la arena
      const d = Math.hypot(c.x, c.y);
      if (d > ARENA) {
        c.x *= ARENA / d;
        c.y *= ARENA / d;
      }
      // la bruma muerde: fuera del círculo se pierde masa
      if (d > haze) c.mass = Math.max(8, c.mass - (3 + c.mass * 0.03) * dt);
    }
    // las células propias se empujan y se funden al estar listas
    for (let i = 0; i < b.cells.length; i++) {
      for (let j = i + 1; j < b.cells.length; j++) {
        const a = b.cells[i];
        const c = b.cells[j];
        const d = dist(a.x, a.y, c.x, c.y);
        const min = radiusOf(a.mass) + radiusOf(c.mass);
        if (a.merge <= m.t && c.merge <= m.t) {
          if (d < min * 0.55) {
            a.mass += c.mass;
            a.merge = m.t;
            c.mass = 0;
          }
        } else if (d < min && d > 0.01) {
          const push = (min - d) * 0.5;
          const nx = (a.x - c.x) / d;
          const ny = (a.y - c.y) / d;
          a.x += nx * push;
          a.y += ny * push;
          c.x -= nx * push;
          c.y -= ny * push;
        }
      }
    }
    b.cells = b.cells.filter((c) => c.mass > 0);
  }

  // masa suelta en movimiento
  for (const e of m.ejected) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const decay = Math.exp(-4 * dt);
    e.vx *= decay;
    e.vy *= decay;
  }

  // comer burbujas, masa suelta, poderes y chocar con medusas
  for (const b of m.players) {
    if (!b.alive) continue;
    for (const c of b.cells) {
      const r = radiusOf(c.mass);
      const pull = b.magnet > 0 ? 420 : 0;
      for (let i = m.pellets.length - 1; i >= 0; i--) {
        const p = m.pellets[i];
        const d = dist(c.x, c.y, p.x, p.y);
        if (pull && d < pull + r && d > r) {
          p.x += ((c.x - p.x) / d) * 520 * dt;
          p.y += ((c.y - p.y) / d) * 520 * dt;
        }
        if (d < r) {
          c.mass += p.mass;
          m.pellets.splice(i, 1);
        }
      }
      for (let i = m.ejected.length - 1; i >= 0; i--) {
        const p = m.ejected[i];
        if (dist(c.x, c.y, p.x, p.y) < r && c.mass > 14) {
          c.mass += p.mass;
          m.ejected.splice(i, 1);
        }
      }
      for (let i = m.pickups.length - 1; i >= 0; i--) {
        const k = m.pickups[i];
        if (dist(c.x, c.y, k.x, k.y) < r + 18 && !b.power) {
          b.power = k.kind;
          m.pickups.splice(i, 1);
          ev.push({ type: 'pickup', by: b.id, kind: k.kind });
        }
      }
      for (let i = m.jellies.length - 1; i >= 0; i--) {
        const j = m.jellies[i];
        if (c.mass > j.mass * 1.25 && dist(c.x, c.y, j.x, j.y) < r * 0.8 && b.shield <= 0) {
          // la medusa pica: la célula grande se rompe en pedazos
          m.jellies.splice(i, 1);
          const pieces = Math.min(MAX_CELLS - b.cells.length, 5);
          const share = c.mass / (pieces + 1);
          c.mass = share + j.mass * 0.5;
          for (let k = 0; k < pieces; k++) {
            const a = (k / pieces) * Math.PI * 2 + m.rnd();
            b.cells.push({ id: m.nextId++, owner: b.id, x: c.x, y: c.y, bx: Math.cos(a) * 560, by: Math.sin(a) * 560, mass: share, merge: m.t + MERGE_TIME });
          }
          c.merge = m.t + MERGE_TIME;
          ev.push({ type: 'pop', by: b.id, x: c.x, y: c.y });
          break;
        }
      }
    }
  }

  // comer a otros jugadores
  for (const a of m.players) {
    if (!a.alive) continue;
    for (const ca of a.cells) {
      for (const o of m.players) {
        if (o === a || !o.alive || o.shield > 0) continue;
        for (let i = o.cells.length - 1; i >= 0; i--) {
          const co = o.cells[i];
          if (ca.mass < co.mass * EAT_RATIO) continue;
          if (dist(ca.x, ca.y, co.x, co.y) < radiusOf(ca.mass) - radiusOf(co.mass) * 0.45) {
            ca.mass += co.mass;
            a.eaten += 1;
            ev.push({ type: 'eat', by: a.id, victim: o.id, mass: co.mass, x: co.x, y: co.y });
            o.cells.splice(i, 1);
          }
        }
        if (!o.cells.length) killPlayer(m, o, a.id, ev);
      }
    }
  }

  // reponer comida, medusas y poderes
  m.respawn -= dt;
  if (m.respawn <= 0) {
    m.respawn = 0.12;
    if (m.pellets.length < PELLETS) m.pellets.push(newPellet(m));
    if (m.t % 9 < 0.15 && m.jellies.length < 14) {
      const p = randomPoint(m.rnd, Math.max(300, hazeRadius(m.t) - 150));
      m.jellies.push({ id: m.nextId++, x: p.x, y: p.y, mass: 100 });
    }
    if (m.pickups.length < 12 && m.rnd() < 0.05) {
      const p = randomPoint(m.rnd, Math.max(300, hazeRadius(m.t) - 150));
      m.pickups.push({ id: m.nextId++, x: p.x, y: p.y, kind: POWERS[Math.floor(m.rnd() * POWERS.length)] });
    }
  }
  m.ejected = m.ejected.filter((e) => Math.hypot(e.x, e.y) <= ARENA + 40);

  // fin: queda uno, o se acaba el tiempo y gana quien tiene más masa
  const left = alive(m);
  if (left.length <= 1 || m.t >= ROUND_TIME) {
    m.over = true;
    const order = ranking(m);
    order.forEach((p, i) => {
      p.placement = i + 1;
    });
    m.winner = order[0]?.id ?? null;
    ev.push({ type: 'end', winner: m.winner });
  }
  return ev;
}
