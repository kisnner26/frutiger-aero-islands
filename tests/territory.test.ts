import { describe, expect, it } from 'vitest';
import { ALL_CELLS, cellAt, cellCenter, claimHint, inWorld, ownerColor } from '../src/world/territory';

const cell = (over = {}) => ({ cx: 5, cy: 5, owner: null as string | null, country: null, shieldUntil: 0, progress: 0, ...over });
const me = (over = {}) => ({ name: 'ana', owned: 2, adjacentOwned: true, energy: 5, ...over });

describe('territorio', () => {
  it('la cuadrícula coincide con el círculo del servidor', () => {
    expect(ALL_CELLS.length).toBe(432);
    expect(inWorld(0, 0)).toBe(false);
    expect(inWorld(12, 12)).toBe(true);
    expect(inWorld(24, 5)).toBe(false);
  });

  it('celda y coordenadas del mundo se corresponden', () => {
    const c = cellCenter(12, 12);
    expect(cellAt(c.x, c.y)).toEqual({ cx: 12, cy: 12 });
    expect(cellAt(5000, 0)).toBeNull();
  });

  it('el color del jugador es estable y distinto entre nombres', () => {
    expect(ownerColor('ana')).toBe(ownerColor('ana'));
    expect(ownerColor('ana')).not.toBe(ownerColor('beto'));
  });

  it('sugiere reclamar, capturar o explica por qué no', () => {
    expect(claimHint(cell(), me()).action).toBe('reclamar');
    expect(claimHint(cell({ owner: 'beto' }), me()).action).toBe('capturar');
    expect(claimHint(cell({ owner: 'beto', shieldUntil: Date.now() + 60000 }), me()).action).toBeNull();
    expect(claimHint(cell(), me({ adjacentOwned: false })).action).toBeNull();
    expect(claimHint(cell({ owner: 'ana' }), me()).reason).toMatch(/tuya/);
    expect(claimHint(cell(), me({ name: null })).action).toBeNull();
    expect(claimHint(cell({ owner: 'beto' }), me({ energy: 1 })).action).toBeNull();
    expect(claimHint(cell(), me({ owned: 0, adjacentOwned: false })).action).toBe('reclamar');
  });
});
