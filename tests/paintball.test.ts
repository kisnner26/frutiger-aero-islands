import { describe, expect, it } from 'vitest';
import { ARENA_R, MAX_AMMO, MAX_HP, applyZone, castShot, createMatch, fire, genObstacles, registerHit, spawnPoint, step, takeHits, zoneAt } from '../src/features/paintball/sim';

const roster = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, hue: i * 40, isBot: i > 0 }));
const rnd = () => 0.5;

describe('paintball royale', () => {
  it('la arena es determinista y deja libre el centro', () => {
    expect(genObstacles(7)).toEqual(genObstacles(7));
    expect(genObstacles(7)).not.toEqual(genObstacles(8));
    for (const o of genObstacles(7)) expect(Math.hypot(o.x, o.y)).toBeLessThan(ARENA_R);
    expect(genObstacles(3).every((o) => Math.hypot(o.x, o.y) >= 30)).toBe(true);
  });

  it('la zona segura se encoge con el tiempo y su centro se queda dentro de la arena', () => {
    const rs = [0, 30, 60, 110, 170, 230].map((t) => zoneAt(t, 5).r);
    for (let i = 1; i < rs.length; i++) expect(rs[i]).toBeLessThanOrEqual(rs[i - 1]);
    expect(zoneAt(0, 5).r).toBe(ARENA_R);
    expect(zoneAt(230, 5).r).toBeLessThan(40);
    for (let t = 0; t < 260; t += 13) expect(Math.hypot(zoneAt(t, 9).x, zoneAt(t, 9).y)).toBeLessThanOrEqual(171);
  });

  it('los jugadores salen repartidos por la orilla y nunca pegados', () => {
    const m = createMatch(1, roster(8));
    for (const p of m.players) expect(Math.hypot(p.x, p.y)).toBeCloseTo(ARENA_R - 90, 0);
    for (let i = 0; i < 8; i++) for (let j = 0; j < i; j++) expect(Math.hypot(m.players[i].x - m.players[j].x, m.players[i].y - m.players[j].y)).toBeGreaterThan(250);
    expect(spawnPoint(0, 8, 1).heading).toBeCloseTo(Math.atan2(-spawnPoint(0, 8, 1).x, spawnPoint(0, 8, 1).y), 6);
  });

  it('un disparo certero le da al enemigo y un obstáculo lo tapa', () => {
    const m = createMatch(1, roster(2));
    m.obstacles = [];
    const [me, foe] = m.players;
    Object.assign(me, { x: 0, y: 0, heading: 0 });
    Object.assign(foe, { x: 0, y: -200 });
    expect(castShot(m, me, 0).victim?.id).toBe('p1');
    m.obstacles = [{ x: 0, y: -100, r: 24, h: 150, kind: 'roca' }];
    expect(castShot(m, me, 0).victim).toBeNull();
  });

  it('disparar gasta munición, tiene recarga y tres impactos eliminan', () => {
    const m = createMatch(2, roster(3));
    m.obstacles = [];
    const [me, a] = m.players;
    Object.assign(me, { x: 0, y: 0, heading: 0, cd: 0 });
    Object.assign(a, { x: 0, y: -150 });
    expect(fire(m, me, rnd)?.victim?.id).toBe('p1');
    expect(me.ammo).toBe(MAX_AMMO - 1);
    expect(fire(m, me, rnd)).toBeNull(); // enfriamiento
    for (let i = 0; i < MAX_HP; i++) registerHit(m, 'p1', 'p0');
    expect(a.alive).toBe(false);
    expect(me.kills).toBe(1);
    expect(a.placement).toBe(3);
  });

  it('gana quien queda en pie y la partida termina', () => {
    const m = createMatch(3, roster(2));
    for (let i = 0; i < MAX_HP; i++) registerHit(m, 'p1', 'p0');
    expect(m.over).toBe(true);
    expect(m.winner).toBe('p0');
    expect(m.players[0].placement).toBe(1);
  });

  it('fuera de la zona se pierde vida y al fin se cae', () => {
    const m = createMatch(4, roster(2));
    m.obstacles = [];
    const me = m.players[0];
    m.t = 120; // zona pequeña
    Object.assign(me, { x: 400, y: 0 });
    const hp0 = me.hp;
    for (let i = 0; i < 600; i++) {
      step(m, 0.1, {}, false, rnd);
      m.t = 120;
      applyZone(m, [me.id]);
      if (!me.alive) break;
    }
    expect(me.hp).toBeLessThan(hp0);
    expect(me.alive).toBe(false);
  });

  it('con bots una partida llega a terminar y siempre hay ganador', () => {
    const m = createMatch(11, roster(8));
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 6000 && !m.over; i++) {
      for (const p of m.players) p.isBot = true;
      step(m, 0.1, {}, true, r);
      for (const h of takeHits(m)) registerHit(m, h.victim, h.killer);
      applyZone(m, m.players.map((p) => p.id));
      m.events.length = 0;
    }
    expect(m.over).toBe(true);
    expect(m.winner).not.toBeNull();
    expect(new Set(m.players.map((p) => p.placement)).size).toBe(8);
  });
});
