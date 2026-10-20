import { describe, expect, it } from 'vitest';
import { CATEGORIES, DEFAULT_AVATAR, FIELD_KEYS, LIMITS, normalizeAvatar, randomAvatar, sameAvatar, type AvatarSpec } from '../src/avatar/model';
import { avatarSvg, shade } from '../src/avatar/svg';

describe('modelo del avatar', () => {
  it('normaliza datos corruptos sin lanzar y conserva los válidos', () => {
    expect(normalizeAvatar(null)).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar('x')).toEqual(DEFAULT_AVATAR);
    const n = normalizeAvatar({ skin: 99, hair: 3, hairColor: -1, eyes: 2.5, mouth: '1', top: 3, extra: 'x' });
    expect(n.skin).toBe(DEFAULT_AVATAR.skin);
    expect(n.hair).toBe(3);
    expect(n.hairColor).toBe(DEFAULT_AVATAR.hairColor);
    expect(n.eyes).toBe(DEFAULT_AVATAR.eyes);
    expect(n.mouth).toBe(DEFAULT_AVATAR.mouth);
    expect(n.top).toBe(3);
    expect((n as unknown as Record<string, unknown>).extra).toBeUndefined();
  });

  it('el azar siempre queda dentro de los rangos y es determinista con la misma semilla', () => {
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const a = randomAvatar(rand);
      for (const k of FIELD_KEYS) {
        expect(Number.isInteger(a[k])).toBe(true);
        expect(a[k]).toBeGreaterThanOrEqual(0);
        expect(a[k]).toBeLessThan(LIMITS[k]);
      }
    }
    s = 3;
    const x = randomAvatar(rand);
    s = 3;
    expect(sameAvatar(x, randomAvatar(rand))).toBe(true);
  });

  it('hay variedad suficiente y las opciones básicas son gratuitas', () => {
    expect(CATEGORIES.hair.length).toBeGreaterThanOrEqual(10);
    expect(LIMITS.skin).toBeGreaterThanOrEqual(8);
    expect(CATEGORIES.body).toHaveLength(3);
  });
});

describe('svg del avatar', () => {
  const variants = (key: keyof AvatarSpec): AvatarSpec[] => {
    if (key === 'v') return [];
    return Array.from({ length: LIMITS[key] }, (_, i) => ({ ...DEFAULT_AVATAR, [key]: i }));
  };

  it('cada opción de cada categoría produce un svg bien formado', () => {
    for (const k of FIELD_KEYS) {
      for (const spec of variants(k)) {
        for (const crop of ['completo', 'cabeza'] as const) {
          const svg = avatarSvg(spec, crop);
          expect(svg.startsWith('<svg')).toBe(true);
          expect(svg.endsWith('</svg>')).toBe(true);
          expect(svg).not.toMatch(/NaN|undefined|null/);
          const open = (svg.match(/<(?!\/|!|\?)[a-zA-Z]/g) ?? []).length;
          const selfClosed = (svg.match(/\/>/g) ?? []).length;
          const closed = (svg.match(/<\/[a-zA-Z]/g) ?? []).length;
          expect(open).toBe(selfClosed + closed);
        }
      }
    }
  });

  it('cambiar una opción cambia el dibujo', () => {
    const base = avatarSvg(DEFAULT_AVATAR);
    expect(avatarSvg({ ...DEFAULT_AVATAR, hair: 7 })).not.toBe(base);
    expect(avatarSvg({ ...DEFAULT_AVATAR, skin: 6 })).not.toBe(base);
    expect(avatarSvg({ ...DEFAULT_AVATAR, top: 3 })).not.toBe(base);
  });

  it('shade oscurece y aclara dentro de rango', () => {
    expect(shade('#808080', -0.5)).toBe('#404040');
    expect(shade('#000000', 0.5)).toBe('#808080');
    expect(shade('#ffffff', 0.5)).toBe('#ffffff');
  });
});

import fs from 'node:fs';

describe('migración del avatar', () => {
  const sql = fs.readFileSync('supabase/migrations/202610200005_avatar.sql', 'utf8');
  it('permite exactamente los campos del cliente y rangos seguros', () => {
    const allowed = [...(sql.match(/v_allowed text\[\] := array\[([^\]]+)\]/)?.[1].matchAll(/'(\w+)'/g) ?? [])].map((m) => m[1]).sort();
    expect(allowed).toEqual(['v', ...FIELD_KEYS].sort());
    expect(sql).toMatch(/set search_path = ''/);
    expect(sql).toMatch(/revoke all on function public\.set_my_avatar\(jsonb\) from public/);
    expect(sql).toMatch(/grant execute on function public\.set_my_avatar\(jsonb\) to authenticated/);
    expect(sql).toMatch(/auth\.uid\(\)/);
    expect(sql).not.toMatch(/grant (insert|update|delete)/i);
    expect(Math.max(...Object.values(LIMITS))).toBeLessThanOrEqual(12);
  });
});
