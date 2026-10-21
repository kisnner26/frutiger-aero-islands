import { describe, expect, it } from 'vitest';
import { ARENA_R, MAX_HP, MAX_HP_CAP, createMatch, damage, frenzyTier, registerHit, step, zoneAt, alive, type PlayerInit } from '../src/features/royale/sim';

const inits = (n: number, humanAuth = true): PlayerInit[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, isBot: i > 0, auth: i > 0 || humanAuth, hue: i * 30 }));

describe('aero royale', () => {
  it('la zona se mantiene, se encoge entre fases y termina pequeña', () => {
    expect(zoneAt(0).radius).toBe(ARENA_R);
    expect(zoneAt(14).radius).toBeCloseTo(ARENA_R, 5);
    expect(zoneAt(30).radius).toBeLessThan(ARENA_R);
    expect(zoneAt(400).radius).toBeLessThan(60);
    let prev = ARENA_R + 1;
    for (let t = 0; t < 200; t += 1) {
      const r = zoneAt(t).radius;
      expect(r).toBeLessThanOrEqual(prev + 1e-9);
      prev = r;
    }
  });

  it('la misma semilla da la misma posición inicial y los mismos objetos', () => {
    const a = createMatch(5, inits(12));
    const b = createMatch(5, inits(12));
    expect(a.players.map((p) => [p.x, p.y])).toEqual(b.players.map((p) => [p.x, p.y]));
    expect(a.pickups).toEqual(b.pickups);
    expect(createMatch(6, inits(12)).pickups).not.toEqual(a.pickups);
  });

  it('una partida solo de bots siempre termina con un ganador', () => {
    for (const seed of [1, 2, 3]) {
      const m = createMatch(seed, inits(12).map((p) => ({ ...p, isBot: true })));
      let guard = 0;
      while (!m.over && guard++ < 60 * 400) step(m, 1 / 30, {});
      expect(m.over).toBe(true);
      expect(alive(m).length).toBeLessThanOrEqual(1);
      expect(m.players.filter((p) => p.placement === 1).length).toBe(1);
    }
  });

  it('el escudo absorbe daño antes que la vida y la baja registra al asesino', () => {
    const m = createMatch(9, inits(3));
    const v = m.players[1];
    v.shield = 30;
    damage(m, v, 'p0', 20);
    expect(v.shield).toBe(10);
    expect(v.hp).toBe(MAX_HP);
    const ev = damage(m, v, 'p0', 500);
    expect(ev && ev.type === 'hit' && ev.dead).toBe(true);
    expect(m.players[0].kills).toBe(1);
    expect(v.alive).toBe(false);
    expect(v.placement).toBe(3);
  });

  it('quien cae fuera de la isla queda eliminado', () => {
    const m = createMatch(4, inits(3, true));
    const me = m.players[0];
    me.x = ARENA_R + 200;
    me.y = 0;
    const ev = step(m, 0.05, { p0: { mx: 0, my: 0, aim: 0, fire: false } });
    expect(ev.some((e) => e.type === 'fall' && e.player === 'p0')).toBe(true);
    expect(me.alive).toBe(false);
  });

  it('un jugador remoto no se mueve ni recibe daño en esta máquina', () => {
    const m = createMatch(4, inits(3));
    const remote = m.players[2];
    remote.auth = false;
    const hp = remote.hp;
    m.bullets.push({ id: 99, owner: 'p0', x: remote.x - 10, y: remote.y, vx: 600, vy: 0, life: 1, dmg: 10 });
    step(m, 0.05, { p0: { mx: 0, my: 0, aim: 0, fire: false } });
    expect(remote.hp).toBe(hp);
  });

  it('los objetos nuevos y su numeración no dependen de lo que pase con los bots (clave para las salas en línea)', () => {
    const a = createMatch(11, inits(12).map((p) => ({ ...p, isBot: true })));
    const b = createMatch(11, inits(12).map((p) => ({ ...p, isBot: false, auth: false })));
    for (let i = 0; i < 60 * 40; i++) {
      step(a, 1 / 60, {});
      step(b, 1 / 60, {});
    }
    // en b nadie se mueve ni dispara; los objetos que aparecieron en el tiempo común son los mismos
    const ids = (m: typeof a) => m.pickups.map((k) => k.id).sort((x, y) => x - y);
    const spawned = (m: typeof a) => m.pickups.filter((k) => k.id > 16).map((k) => [k.id, k.kind, Math.round(k.x), Math.round(k.y)]);
    expect(Math.max(...ids(a))).toBeGreaterThanOrEqual(17);
    expect(spawned(a).filter((s) => spawned(b).some((t) => t[0] === s[0]))).toEqual(spawned(b).filter((t) => spawned(a).some((s) => s[0] === t[0])));
  });

  it('el frenesí solo lo construyen los clics rápidos y no mantener pulsado', () => {
    const held = createMatch(3, inits(3));
    const tapped = createMatch(3, inits(3));
    for (let i = 0; i < 60 * 2; i++) {
      step(held, 1 / 60, { p0: { mx: 0, my: 0, aim: 0, fire: true } });
      step(tapped, 1 / 60, { p0: { mx: 0, my: 0, aim: 0, fire: false, tap: i % 15 === 0 } });
    }
    expect(held.players[0].frenzy).toBe(0);
    expect(tapped.players[0].frenzy).toBeGreaterThan(25);
    expect(frenzyTier(tapped.players[0].frenzy)).toBeGreaterThanOrEqual(1);
  });

  it('a más frenesí se dispara más rápido', () => {
    const slow = createMatch(3, inits(3));
    const fast = createMatch(3, inits(3));
    fast.players[0].frenzy = 80;
    fast.players[0].lastTap = 0;
    const count = (m: typeof slow) => {
      let shots = 0;
      for (let i = 0; i < 60 * 3; i++) {
        m.players[0].lastTap = m.t;
        shots += step(m, 1 / 60, { p0: { mx: 0, my: 0, aim: 0, fire: true } }).filter((e) => e.type === 'shot').length;
        m.players[0].frenzy = m === fast ? 80 : m.players[0].frenzy;
      }
      return shots;
    };
    expect(count(fast)).toBeGreaterThan(count(slow));
  });

  it('los golpes seguidos dan premios en sus escalones y el combo se corta si pasa el tiempo', () => {
    const m = createMatch(8, inits(3));
    const me = m.players[0];
    me.hp = 50;
    const rewards: Array<string | null> = [];
    for (let i = 1; i <= 16; i++) {
      m.t += 0.5;
      for (const e of registerHit(m, me, false)) if (e.type === 'combo') rewards.push(e.reward);
    }
    expect(rewards.filter(Boolean)).toEqual(['heal', 'shield', 'triple', 'ring', 'life']);
    expect(me.maxHp).toBeGreaterThan(MAX_HP);
    expect(me.maxHp).toBeLessThanOrEqual(MAX_HP_CAP);
    expect(me.triple).toBeGreaterThan(0);
    expect(me.bestCombo).toBe(16);
    m.t += 5;
    const ev = step(m, 0.05, { p0: { mx: 0, my: 0, aim: 0, fire: false } });
    expect(ev.some((e) => e.type === 'comboEnd')).toBe(true);
    expect(me.combo).toBe(0);
  });
});
