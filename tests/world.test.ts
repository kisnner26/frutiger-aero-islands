import { describe, expect, it } from 'vitest';
import { CATALOG_MAP } from '../src/catalog/catalog';
import { isLand } from '../src/art/planet';
import { validateObject } from '../src/domain/geometry';
import { BASIN_RADIUS, DEFAULT_WORLD_CAMERA, clampWorldCamera, screenToWorld, worldFit, worldObjectScale, worldToScreen, zoomWorldAt } from '../src/world/worldCamera';
import { buildArchipelago, minePosition } from '../src/world/archipelago';
import { countryAnchor } from '../src/world/geoProjection';
import { parseWorldView, prepareFromIsland } from '../src/world/worldState';

describe('continentes', () => {
  it('reconoce tierra y océano en puntos conocidos', () => {
    expect(isLand(-100, 40)).toBe(true); // norteamérica
    expect(isLand(-60, -15)).toBe(true); // sudamérica
    expect(isLand(20, 5)).toBe(true); // áfrica
    expect(isLand(100, 50)).toBe(true); // eurasia
    expect(isLand(135, -25)).toBe(true); // australia
    expect(isLand(-150, 0)).toBe(false); // pacífico
    expect(isLand(-30, 0)).toBe(false); // atlántico
    expect(isLand(75, -30)).toBe(false); // índico
  });
});

describe('archipiélago', () => {
  it('sin jugadores no existe ninguna isla inventada', () => {
    expect(buildArchipelago(null)).toEqual([]);
    expect(buildArchipelago({ objects: [], level: 1 }).map((i) => i.id)).toEqual(['mia']);
  });

  it('incluye mi isla y las de jugadores reales con su usuario', () => {
    const mine = { objects: [{ id: 'a', assetId: 'palmera', x: 500, y: 500, scale: 1, rotation: 0 }], level: 3 };
    const other = { id: 'x1', username: 'ana', displayName: 'ana', country: 'es', objects: mine.objects, level: 2, createdAt: '2026-01-01' };
    const list = buildArchipelago(mine, [other], 'ni');
    expect(list[0]).toMatchObject({ id: 'mia', kind: 'mia', level: 3 });
    expect(list[1]).toMatchObject({ id: 'x1', kind: 'jugador', name: '@ana', username: 'ana', country: 'es' });
    for (const o of list.flatMap((i) => i.objects)) expect(validateObject(CATALOG_MAP.get(o.assetId), o)).toBeNull();
  });

  it('las islas caben dentro de la cuenca y cada una queda en la zona de su país', () => {
    for (const i of buildArchipelago({ objects: [], level: 1 }, [], 'ni')) expect(Math.hypot(i.x, i.y)).toBeLessThan(BASIN_RADIUS * 0.9);
    const list = buildArchipelago({ objects: [], level: 1 }, [], 'ni');
    expect(list[0]).toMatchObject({ id: 'mia', country: 'ni', ...countryAnchor('ni') });
    expect(minePosition('ni')).toEqual(countryAnchor('ni'));
  });

  it('cambiar de país mueve mi isla de zona y sin país va al mar abierto', () => {
    const a = minePosition('ni');
    const b = minePosition('jp');
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(300);
    expect(minePosition(null)).toEqual(countryAnchor(null));
  });
});

describe('cámara del mundo', () => {
  const vp = { width: 1000, height: 700 };
  it('ida y vuelta pantalla/mundo', () => {
    const cam = { cx: 120, cy: -60, zoom: 1.7 };
    const s = worldToScreen({ x: 33, y: 44 }, cam, vp);
    const w = screenToWorld(s, cam, vp);
    expect(w.x).toBeCloseTo(33, 6);
    expect(w.y).toBeCloseTo(44, 6);
  });

  it('acota zoom y centro', () => {
    expect(clampWorldCamera({ cx: 1e6, cy: 0, zoom: 99 }).zoom).toBe(6);
    expect(Math.hypot(clampWorldCamera({ cx: 1e6, cy: 1e6, zoom: 1 }).cx, clampWorldCamera({ cx: 1e6, cy: 1e6, zoom: 1 }).cy)).toBeLessThanOrEqual(760.001);
  });

  it('el zoom mantiene fijo el punto bajo el puntero', () => {
    const at = { x: 700, y: 200 };
    const before = screenToWorld(at, DEFAULT_WORLD_CAMERA, vp);
    const after = screenToWorld(at, zoomWorldAt(DEFAULT_WORLD_CAMERA, vp, at, 1.9), vp);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it('limita el tamaño visual de una isla al acercar el mapa', () => {
    const worldWidth = 288;
    expect(worldObjectScale(vp, 1, worldWidth)).toBe(1);
    const scale = worldObjectScale(vp, 6, worldWidth);
    const screenWidth = worldWidth * worldFit(vp) * 6 * scale;
    expect(scale).toBeLessThan(1);
    expect(screenWidth).toBeLessThanOrEqual(Math.min(520, vp.width * 0.36, vp.height * 0.42) + 0.001);
  });
});

describe('estado de la vista', () => {
  it('rechaza datos corruptos y acota los válidos', () => {
    expect(parseWorldView(null)).toBeNull();
    expect(parseWorldView('{no')).toBeNull();
    expect(parseWorldView(JSON.stringify({ mode: 'x', cx: 0, cy: 0, zoom: 1 }))).toBeNull();
    expect(parseWorldView(JSON.stringify({ mode: 'dentro', cx: 5000, cy: 0, zoom: 50, selectedId: 'mia' }))).toMatchObject({ mode: 'dentro', zoom: 6, selectedId: 'mia' });
  });

  it('al salir de la isla se prepara entrar al archipiélago con mi isla seleccionada', () => {
    const store = new Map<string, string>();
    prepareFromIsland({ x: -20, y: 60 }, { setItem: (k, v) => void store.set(k, v) });
    expect(parseWorldView([...store.values()][0])).toMatchObject({ mode: 'dentro', selectedId: 'mia', cx: -20, cy: 60 });
  });
});
