import { describe, expect, it } from 'vitest';
import { CATALOG_MAP } from '../src/catalog/catalog';
import { isInWater, isOnLand, validateObject, validatePlacement } from '../src/domain/geometry';
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
    expect(isInWater(5, 500, 14)).toBe(false);
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
