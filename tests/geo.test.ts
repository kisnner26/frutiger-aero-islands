import { describe, expect, it } from 'vitest';
import { COUNTRIES, findCountry, normalize, searchCountries } from '../src/world/countries';
import { MAP_RADIUS, PLACEMENT_LIMIT, countryAnchor, islandGap, placeIslands, projectLonLat } from '../src/world/geoProjection';

describe('países', () => {
  it('códigos únicos, nombres en minúsculas y coordenadas válidas', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(130);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[a-z]{2}$/);
      expect(c.name).toBe(c.name.toLowerCase());
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });

  it('busca sin tildes ni mayúsculas', () => {
    expect(normalize('Perú')).toBe('peru');
    expect(searchCountries('peru').map((c) => c.code)).toContain('pe');
    expect(searchCountries('NICARAG')[0].code).toBe('ni');
    expect(searchCountries('zzzz')).toEqual([]);
    expect(findCountry('NI')?.name).toBe('nicaragua');
    expect(findCountry(null)).toBeUndefined();
  });
});

describe('proyección del mundo', () => {
  it('todos los países caen dentro del disco y el centro proyecta cerca del origen', () => {
    for (const c of COUNTRIES) expect(Math.hypot(projectLonLat(c.lon, c.lat).x, projectLonLat(c.lon, c.lat).y)).toBeLessThanOrEqual(MAP_RADIUS + 1);
    const o = projectLonLat(-25, 22);
    expect(Math.hypot(o.x, o.y)).toBeLessThan(1e-6);
  });

  it('respeta la geografía: américa a la izquierda de áfrica y europa al norte', () => {
    expect(countryAnchor('mx').x).toBeLessThan(countryAnchor('ng').x);
    expect(countryAnchor('es').y).toBeLessThan(countryAnchor('za').y);
    expect(countryAnchor('au').x).toBeGreaterThan(countryAnchor('br').x);
  });
});

describe('reparto de islas por zonas', () => {
  const mk = (n: number, country: string | null, offset = 0) => Array.from({ length: n }, (_, i) => ({ id: `${country}-${i}`, country, order: i + offset }));

  it('la primera isla de un país queda en su punto de referencia', () => {
    const p = placeIslands([{ id: 'a', country: 'ni', order: 1 }]);
    expect(p.get('a')).toEqual(countryAnchor('ni'));
  });

  it('es determinista aunque cambie el orden de entrada', () => {
    const list = [...mk(5, 'es'), ...mk(4, 'pt'), ...mk(3, null)];
    const a = placeIslands(list);
    const b = placeIslands([...list].reverse());
    for (const [id, pos] of a) expect(b.get(id)).toEqual(pos);
  });

  it('no solapa islas, ni siquiera las de países vecinos muy densos', () => {
    const list = [...mk(8, 'nl'), ...mk(8, 'be'), ...mk(8, 'de'), ...mk(8, 'fr'), ...mk(6, 'gb'), ...mk(4, null)];
    const p = [...placeIslands(list).values()];
    for (let i = 0; i < p.length; i++) {
      expect(Math.hypot(p[i].x, p[i].y)).toBeLessThanOrEqual(PLACEMENT_LIMIT + 1e-6);
      for (let j = i + 1; j < p.length; j++) expect(islandGap(p[i], p[j])).toBeGreaterThanOrEqual(0.999);
    }
  });

  it('las islas sin país van al mar abierto central', () => {
    const p = placeIslands([{ id: 'x', country: null, order: 0 }]);
    expect(p.get('x')).toEqual(countryAnchor(null));
  });
});

import fs from 'node:fs';

describe('migración de país', () => {
  const sql = fs.readFileSync('supabase/migrations/202610200002_country.sql', 'utf8');
  it('lista exactamente los mismos códigos que el cliente', () => {
    const inSql = [...sql.matchAll(/\('([a-z]{2})'\)/g)].map((m) => m[1]).sort();
    expect(inSql).toEqual(COUNTRIES.map((c) => c.code).sort());
  });

  it('protege la escritura: función con search_path vacío, solo para autenticados y sin escritura directa', () => {
    expect(sql).toMatch(/set search_path = ''/);
    expect(sql).toMatch(/revoke all on function public\.set_my_country\(text\) from public/);
    expect(sql).toMatch(/grant execute on function public\.set_my_country\(text\) to authenticated/);
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(sql).toMatch(/interval '30 days'/);
    expect(sql).toMatch(/auth\.uid\(\)/);
  });
});
