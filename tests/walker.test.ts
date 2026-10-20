import { describe, expect, it } from 'vitest';
import { CATALOG_MAP } from '../src/catalog/catalog';
import { canStand, startWalker, stepWalker, toCamera } from '../src/features/explore/walker';

describe('exploración a pie', () => {
  it('empieza en tierra firme', () => {
    const w = startWalker([], CATALOG_MAP, 1);
    expect(canStand(w.x, w.y, [], CATALOG_MAP, 1)).toBe(true);
  });

  it('no sale al agua: caminar sin parar se queda dentro de la isla', () => {
    let w = { x: 500, y: 500, heading: Math.PI / 2 };
    for (let i = 0; i < 600; i++) w = stepWalker(w, { forward: 1, strafe: 0, turn: 0 }, 1 / 30, [], CATALOG_MAP, 1);
    expect(canStand(w.x, w.y, [], CATALOG_MAP, 1)).toBe(true);
    expect(w.x).toBeLessThan(860);
  });

  it('los objetos de tierra bloquean el paso', () => {
    const tree = [{ id: 'a', assetId: 'palmera', x: 500, y: 450, scale: 1, rotation: 0 }];
    let w = { x: 500, y: 520, heading: 0 };
    for (let i = 0; i < 90; i++) w = stepWalker(w, { forward: 1, strafe: 0, turn: 0 }, 1 / 30, tree, CATALOG_MAP, 1);
    expect(Math.hypot(w.x - 500, w.y - 450)).toBeGreaterThan(20);
  });

  it('proyecta delante y a la derecha con signo correcto', () => {
    const cam = { x: 500, y: 500, heading: 0 }; // mira al norte
    expect(toCamera(500, 400, cam).depth).toBeCloseTo(100);
    expect(toCamera(600, 500, cam).lateral).toBeCloseTo(100);
  });
});
