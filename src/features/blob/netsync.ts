/**
 * aero blob en línea: el anfitrión corre toda la simulación y difunde fotos del estado;
 * los demás mandan sus teclas y dibujan lo recibido, suavizando las posiciones.
 * las burbujas de comida viajan como diferencias (añadidas/quitadas) y cada pocos segundos como lista completa por si se perdió algún mensaje.
 */
import type { AvatarSpec } from '../../avatar/model';
import type { BlobEvent, Input, Match, PowerKind } from './sim';

export interface BlobStart { seed: number; roster: Array<{ id: string; name: string; hue: number; isBot: boolean }>; specs: Record<string, AvatarSpec | null> }
export type PlayerS = { id: string; a: number; c: Array<[number, number, number, number]>; p: PowerKind | null; sh: number; mg: number; d: number; f: number; pl: number; e: number; b: number };
export interface Snapshot {
  t: number;
  o: number;
  w: string | null;
  pl: PlayerS[];
  j: Array<[number, number, number, number]>;
  k: Array<[number, number, number, PowerKind]>;
  ej: Array<[number, number, number, number, number]>;
  pa: Array<[number, number, number, number]>;
  pr: number[];
  pf?: Array<[number, number, number, number]>;
  ev: BlobEvent[];
}

export type BlobMsg =
  | { k: 'start'; start: BlobStart }
  | { k: 'snap'; s: Snapshot }
  | { k: 'in'; id: string; tx: number; ty: number }
  | { k: 'act'; id: string; split?: boolean; eject?: boolean; power?: boolean };

const r1 = (n: number) => Math.round(n);
const r2 = (n: number) => Math.round(n * 10) / 10;

/** `sent` recuerda qué burbujas ya conocen los clientes; `full` reenvía la lista entera. */
export function makeSnapshot(m: Match, sent: Set<number>, full: boolean, ev: BlobEvent[]): Snapshot {
  const snap: Snapshot = {
    t: r2(m.t), o: m.over ? 1 : 0, w: m.winner,
    pl: m.players.map((p) => ({
      id: p.id, a: p.alive ? 1 : 0, c: p.cells.map((c) => [c.id, r1(c.x), r1(c.y), r2(c.mass)]), p: p.power,
      sh: r2(p.shield), mg: r2(p.magnet), d: r2(p.dash), f: r2(p.frozen), pl: p.placement, e: p.eaten, b: p.isBot ? 1 : 0,
    })),
    j: m.jellies.map((j) => [j.id, r1(j.x), r1(j.y), r1(j.mass)]),
    k: m.pickups.map((k) => [k.id, r1(k.x), r1(k.y), k.kind]),
    ej: m.ejected.map((e) => [e.id, r1(e.x), r1(e.y), e.hue, r1(e.mass)]),
    pa: [], pr: [], ev,
  };
  if (full) {
    sent.clear();
    snap.pf = m.pellets.map((p) => { sent.add(p.id); return [p.id, r1(p.x), r1(p.y), p.hue]; });
    return snap;
  }
  const now = new Set<number>();
  for (const p of m.pellets) {
    now.add(p.id);
    if (!sent.has(p.id)) snap.pa.push([p.id, r1(p.x), r1(p.y), p.hue]);
  }
  for (const id of sent) if (!now.has(id)) snap.pr.push(id);
  sent.clear();
  for (const id of now) sent.add(id);
  return snap;
}

/** copia la foto en el estado local; las celdas conservan su posición mostrada para que el movimiento sea fluido. */
export function applySnapshot(m: Match, s: Snapshot) {
  m.t = s.t;
  m.over = !!s.o;
  m.winner = s.w;
  for (const ps of s.pl) {
    const b = m.players.find((p) => p.id === ps.id);
    if (!b) continue;
    const old = new Map(b.cells.map((c) => [c.id, c]));
    b.alive = !!ps.a;
    b.isBot = !!ps.b;
    b.power = ps.p;
    b.shield = ps.sh;
    b.magnet = ps.mg;
    b.dash = ps.d;
    b.frozen = ps.f;
    b.placement = ps.pl;
    b.eaten = ps.e;
    b.cells = ps.c.map(([id, x, y, mass]) => {
      const prev = old.get(id);
      return { id, owner: b.id, x: prev ? prev.x : x, y: prev ? prev.y : y, bx: 0, by: 0, mass, merge: 0, nx: x, ny: y };
    });
    if (b.cells.length) {
      b.tx = b.cells[0].nx ?? b.cells[0].x;
      b.ty = b.cells[0].ny ?? b.cells[0].y;
    }
  }
  if (s.pf) m.pellets = s.pf.map(([id, x, y, hue]) => ({ id, x, y, hue, mass: 1, vx: 0, vy: 0 }));
  else {
    if (s.pr.length) {
      const gone = new Set(s.pr);
      m.pellets = m.pellets.filter((p) => !gone.has(p.id));
    }
    for (const [id, x, y, hue] of s.pa) m.pellets.push({ id, x, y, hue, mass: 1, vx: 0, vy: 0 });
  }
  m.ejected = s.ej.map(([id, x, y, hue, mass]) => ({ id, x, y, hue, mass, vx: 0, vy: 0 }));
  m.jellies = s.j.map(([id, x, y, mass]) => ({ id, x, y, mass }));
  m.pickups = s.k.map(([id, x, y, kind]) => ({ id, x, y, kind }));
}

export function smoothCells(m: Match, dt: number) {
  const k = 1 - Math.exp(-dt * 16);
  for (const p of m.players) {
    for (const c of p.cells) {
      if (c.nx === undefined || c.ny === undefined) continue;
      c.x += (c.nx - c.x) * k;
      c.y += (c.ny - c.y) * k;
    }
  }
}

/** entradas recibidas por red: los gestos se guardan hasta que el anfitrión los gasta en un paso. */
export class RemoteInputs {
  private cur = new Map<string, Input>();
  set(id: string, tx: number, ty: number) {
    const c = this.cur.get(id);
    this.cur.set(id, { tx, ty, split: c?.split ?? false, eject: c?.eject ?? false, power: c?.power ?? false });
  }
  act(id: string, a: { split?: boolean; eject?: boolean; power?: boolean }) {
    const c = this.cur.get(id) ?? { tx: 0, ty: 0, split: false, eject: false, power: false };
    this.cur.set(id, { ...c, split: c.split || !!a.split, eject: c.eject || !!a.eject, power: c.power || !!a.power });
  }
  has(id: string) { return this.cur.has(id); }
  /** devuelve las entradas y borra los gestos de un solo uso */
  take(): Record<string, Input> {
    const out: Record<string, Input> = {};
    for (const [id, i] of this.cur) {
      out[id] = { ...i };
      i.split = i.eject = i.power = false;
    }
    return out;
  }
}
