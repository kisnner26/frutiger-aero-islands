import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../src/world/countries';
import { FLAGS } from '../src/world/flags';

describe('banderas', () => {
  it('cada país seleccionable tiene su bandera y no sobran banderas sin país', () => {
    const missing = COUNTRIES.filter((c) => !FLAGS[c.code]).map((c) => c.code);
    expect(missing).toEqual([]);
    const extra = Object.keys(FLAGS).filter((k) => !COUNTRIES.some((c) => c.code === k));
    expect(extra).toEqual([]);
  });

  it('las composiciones están bien formadas', () => {
    const color = /^#[0-9a-f]{6}$|^none$/i;
    const check = (layers: (typeof FLAGS)[string]) => {
      expect(layers.length).toBeGreaterThan(0);
      for (const l of layers) {
        if (l.t === 'h' || l.t === 'v') {
          expect(l.c.length).toBeGreaterThan(0);
          if (l.w) expect(l.w).toHaveLength(l.c.length);
          l.c.forEach((c) => expect(c).toMatch(color));
        } else if (l.t === 'g') check(l.layers);
        else if (l.t === 'poly') {
          expect(l.pts.length).toBeGreaterThanOrEqual(3);
          expect(l.c).toMatch(color);
        } else expect((l as { c: string }).c).toMatch(color);
      }
    };
    for (const code of Object.keys(FLAGS)) check(FLAGS[code]);
  });
});
