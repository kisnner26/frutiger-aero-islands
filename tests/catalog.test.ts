import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/catalog/catalog';

describe('catálogo', () => {
  it('cada decoración tiene ilustración, ids únicos y cabe en las reglas del servidor', () => {
    expect(new Set(CATALOG.map((c) => c.id)).size).toBe(CATALOG.length);
    const sql = readFileSync('supabase/migrations/202610200014_decorations_2.sql', 'utf8');
    for (const c of CATALOG) {
      expect(() => readFileSync(`public/assets/decorations/${c.id}.svg`)).not.toThrow();
      expect(sql).toContain(`'${c.id}'`);
      expect(c.minScale).toBeGreaterThanOrEqual(0.7);
      expect(c.maxScale).toBeLessThanOrEqual(2);
      expect(c.orientations.every((o) => o === 0 || o === 1)).toBe(true);
    }
  });
});
