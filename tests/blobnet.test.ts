import { describe, expect, it } from 'vitest';
import { applySnapshot, makeSnapshot, RemoteInputs } from '../src/features/blob/netsync';
import { createMatch, step, totalMass } from '../src/features/blob/sim';

const inits = [
  { id: 'a', name: 'a', hue: 10, isBot: false },
  { id: 'b', name: 'b', hue: 90, isBot: false },
  { id: 'c', name: 'c', hue: 200, isBot: true },
];

describe('aero blob en linea', () => {
  it('el cliente reconstruye el estado del anfitrion con diferencias de burbujas', () => {
    const host = createMatch(7, inits);
    const client = createMatch(7, inits);
    const sent = new Set<number>();
    const first = makeSnapshot(host, sent, true, []);
    applySnapshot(client, first);
    const remote = new RemoteInputs();
    for (let i = 0; i < 600; i++) {
      remote.set('a', 400, 0);
      remote.set('b', -400, 200);
      step(host, 1 / 60, remote.take());
      if (i % 5 === 4) applySnapshot(client, makeSnapshot(host, sent, false, []));
    }
    applySnapshot(client, makeSnapshot(host, sent, false, []));
    expect(client.pellets.map((p) => p.id).sort()).toEqual(host.pellets.map((p) => p.id).sort());
    for (const hp of host.players) {
      const cp = client.players.find((p) => p.id === hp.id)!;
      expect(cp.cells.length).toBe(hp.cells.length);
      expect(Math.abs(totalMass(cp) - totalMass(hp))).toBeLessThan(1);
    }
  });

  it('un mensaje perdido se corrige con la lista completa', () => {
    const host = createMatch(9, inits);
    const client = createMatch(9, inits);
    const sent = new Set<number>();
    applySnapshot(client, makeSnapshot(host, sent, true, []));
    for (let i = 0; i < 300; i++) step(host, 1 / 60, {});
    makeSnapshot(host, sent, false, []); // este se pierde
    for (let i = 0; i < 120; i++) step(host, 1 / 60, {});
    applySnapshot(client, makeSnapshot(host, sent, true, []));
    expect(client.pellets.length).toBe(host.pellets.length);
  });

  it('los gestos de un solo uso se gastan una vez', () => {
    const r = new RemoteInputs();
    r.set('a', 1, 2);
    r.act('a', { split: true });
    expect(r.take().a.split).toBe(true);
    expect(r.take().a.split).toBe(false);
  });
});
