import { describe, expect, it } from 'vitest';
import { CATALOG_MAP } from '../src/catalog/catalog';
import { LAND_TIERS, isInWater, isOnLand, landRadii, landTier, nextExpansionLevel, validateObject, validateSaved, validatePlacement } from '../src/domain/geometry';
import { project, unproject } from '../src/engine/projection';
import { DEFAULT_CAMERA, MAX_ZOOM, MIN_ZOOM, clampCamera, screenToScene, sceneToScreen, zoomAt } from '../src/engine/camera';

const palmera = CATALOG_MAP.get('palmera')!;
const pez = CATALOG_MAP.get('pez')!;

describe('geometría', () => {
  it('centro es tierra y esquina es agua', () => {
    expect(isOnLand(500, 500, 20)).toBe(true);
    expect(isInWater(30, 30, 14)).toBe(true);
    expect(isOnLand(30, 30, 14)).toBe(false);
  });

  it('borde de tierra: el disco debe caber', () => {
    // radio 20: la elipse reducida tiene rx 340
    expect(isOnLand(840, 500, 20)).toBe(true);
    expect(isOnLand(841, 500, 20)).toBe(false);
  });

  it('borde de agua: fuera de la elipse ampliada', () => {
    // radio 14: elipse ampliada rx 374
    expect(isInWater(874, 500, 14)).toBe(true);
    expect(isInWater(873, 500, 14)).toBe(false);
    expect(isInWater(-60000, 500, 14)).toBe(false);
  });

  it('valida catálogo, escala, orientación y zona', () => {
    expect(validateObject(palmera, { x: 500, y: 500, scale: 1, rotation: 0 })).toBeNull();
    expect(validateObject(palmera, { x: 500, y: 500, scale: 3, rotation: 0 })).toBe('escala-invalida');
    expect(validateObject(palmera, { x: 500, y: 500, scale: 1, rotation: 5 })).toBe('orientacion-invalida');
    expect(validateObject(palmera, { x: 20, y: 20, scale: 1, rotation: 0 })).toBe('fuera-de-zona');
    expect(validateObject(pez, { x: 500, y: 500, scale: 1, rotation: 0 })).toBe('fuera-de-zona');
    expect(validateObject(pez, { x: 60, y: 60, scale: 1, rotation: 0 })).toBeNull();
    expect(validateObject(undefined, { x: 1, y: 1, scale: 1, rotation: 0 })).toBe('objeto-desconocido');
    expect(validateObject(palmera, { x: NaN, y: 500, scale: 1, rotation: 0 })).toBe('no-finito');
  });

  it('rechaza el objeto 151', () => {
    expect(validatePlacement(palmera, { x: 500, y: 500, scale: 1, rotation: 0 }, 149)).toBeNull();
    expect(validatePlacement(palmera, { x: 500, y: 500, scale: 1, rotation: 0 }, 150)).toBe('limite-de-objetos');
  });
});

describe('expansión del terreno', () => {
  it('el tamaño depende del nivel y nunca encoge', () => {
    expect([1, 3, 4, 6, 7, 10].map(landTier)).toEqual([0, 0, 1, 1, 2, 3]);
    for (let l = 1; l < 12; l++) {
      expect(landRadii(l + 1).rx).toBeGreaterThanOrEqual(landRadii(l).rx);
      expect(landRadii(l + 1).ry).toBeGreaterThanOrEqual(landRadii(l).ry);
    }
    expect(nextExpansionLevel(1)).toBe(4);
    expect(nextExpansionLevel(5)).toBe(7);
    expect(nextExpansionLevel(7)).toBe(10);
    expect(nextExpansionLevel(14)).toBeNull();
  });

  it('la tierra llega más lejos en cada tamaño', () => {
    expect(isOnLand(860, 500, 20, 1)).toBe(false);
    expect(isOnLand(860, 500, 20, 4)).toBe(true);
    expect(isOnLand(900, 500, 20, 4)).toBe(false);
    expect(isOnLand(900, 500, 20, 7)).toBe(true);
  });

  it('el agua retrocede al crecer la isla y siempre queda borde de mar', () => {
    expect(isInWater(880, 500, 14, 1)).toBe(true);
    expect(isInWater(880, 500, 14, 4)).toBe(false);
    for (const t of LAND_TIERS) expect(isInWater(1000 - 14, 500, 14, t.minLevel)).toBe(true);
  });

  it('lo colocado en tierra a nivel 1 sigue siendo válido al crecer', () => {
    for (const item of [palmera, CATALOG_MAP.get('arbol')!, CATALOG_MAP.get('flores')!]) {
      for (const [x, y] of [[500, 500], [840, 500], [500, 780], [250, 400]]) {
        if (validateObject(item, { x, y, scale: 1, rotation: 0 }, 1) === null) {
          expect(validateObject(item, { x, y, scale: 1, rotation: 0 }, 4)).toBeNull();
          expect(validateObject(item, { x, y, scale: 1, rotation: 0 }, 7)).toBeNull();
        }
      }
    }
  });

  it('un pez guardado en el mar sigue válido aunque la isla crezca sobre él', () => {
    const pezEnMar = { x: 880, y: 500, scale: 1, rotation: 0 };
    expect(validateObject(pez, pezEnMar, 4)).toBe('fuera-de-zona');
    expect(validateSaved(pez, pezEnMar, 4)).toBeNull();
    expect(validateSaved(pez, { ...pezEnMar, x: 500 }, 7)).toBe('fuera-de-zona');
  });

  it('valida con el nivel de la isla', () => {
    expect(validateObject(palmera, { x: 880, y: 500, scale: 1, rotation: 0 }, 1)).toBe('fuera-de-zona');
    expect(validateObject(palmera, { x: 880, y: 500, scale: 1, rotation: 0 }, 7)).toBeNull();
    expect(validatePlacement(palmera, { x: 900, y: 500, scale: 1, rotation: 0 }, 0, 4)).toBe('fuera-de-zona');
  });
});

describe('proyección y cámara', () => {
  it('ida y vuelta de coordenadas', () => {
    for (const [x, y] of [[0, 0], [500, 500], [123, 877], [1000, 1000]]) {
      const p = project(x, y);
      const w = unproject(p.x, p.y);
      expect(w.x).toBeCloseTo(x, 6);
      expect(w.y).toBeCloseTo(y, 6);
    }
  });

  it('pantalla y escena son inversas con cámara arbitraria', () => {
    const vp = { width: 390, height: 844 };
    const cam = { zoom: 1.7, panX: 33, panY: -41 };
    const s = sceneToScreen({ x: 12, y: -34 }, cam, vp);
    const back = screenToScene(s, cam, vp);
    expect(back.x).toBeCloseTo(12, 6);
    expect(back.y).toBeCloseTo(-34, 6);
  });

  it('zoom acotado a 0.5–2.5 y limita el desplazamiento', () => {
    const vp = { width: 1440, height: 900 };
    expect(zoomAt(DEFAULT_CAMERA, vp, { x: 100, y: 100 }, 99).zoom).toBe(MAX_ZOOM);
    expect(zoomAt(DEFAULT_CAMERA, vp, { x: 100, y: 100 }, 0.01).zoom).toBe(MIN_ZOOM);
    expect(Math.abs(clampCamera({ zoom: 1, panX: 1e6, panY: -1e6 }, vp).panX)).toBeLessThan(2000);
  });

  it('zoom mantiene fijo el punto bajo el puntero', () => {
    const vp = { width: 1000, height: 800 };
    const at = { x: 700, y: 300 };
    const before = screenToScene(at, DEFAULT_CAMERA, vp);
    const cam2 = zoomAt(DEFAULT_CAMERA, vp, at, 1.8);
    const after = screenToScene(at, cam2, vp);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });
});

import { landIndexOf, landLevelOf, landPrice, maxObjectsFor, radiiOfIndex } from '../src/domain/geometry';
describe('terreno comprado', () => {
  it('suma tamaños comprados con tope y nunca baja del nivel', () => {
    expect(landIndexOf(1, 0)).toBe(0);
    expect(landIndexOf(1, 2)).toBe(2);
    expect(landIndexOf(7, 9)).toBe(11);
    expect(landTier(landLevelOf(1, 9))).toBe(9);
    expect(landLevelOf(20, 0)).toBe(20);
    expect(landTier(landLevelOf(1, 1))).toBe(1);
  });
  it('el descuento baja el precio', () => {
    expect(landPrice(1)).toBe(400);
    expect(landPrice(1, 0.25)).toBe(300);
  });
});

describe('terreno sin techo', () => {
  it('los radios crecen sin límite y el precio sube cada vez', () => {
    expect(radiiOfIndex(4).rx).toBe(470);
    expect(radiiOfIndex(14).rx).toBe(1470);
    for (let i = 5; i < 40; i++) {
      expect(radiiOfIndex(i).rx).toBeGreaterThan(radiiOfIndex(i - 1).rx);
      expect(landPrice(i)).toBeGreaterThan(landPrice(i - 1));
    }
  });
  it('lo colocado en tierra sigue siendo válido al ampliar y se puede poner lejos del centro', () => {
    const level = landLevelOf(1, 12);
    expect(isOnLand(1500, 500, 20, level)).toBe(true);
    expect(isOnLand(-500, 500, 20, level)).toBe(true);
    expect(validateObject(palmera, { x: 1500, y: 500, scale: 1, rotation: 0 }, level)).toBeNull();
    expect(validateObject(palmera, { x: 1500, y: 500, scale: 1, rotation: 0 }, 1)).not.toBeNull();
  });
  it('más terreno permite más objetos', () => {
    expect(maxObjectsFor(landLevelOf(1, 0))).toBe(150);
    expect(maxObjectsFor(landLevelOf(1, 14))).toBeGreaterThan(150);
    expect(maxObjectsFor(landLevelOf(1, 400))).toBe(1000);
  });
});
