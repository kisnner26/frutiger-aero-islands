import { describe, expect, it } from 'vitest';
import { lightAt } from '../src/features/editor/lightCurve';

describe('lightAt', () => {
  it('mediodía sin velo y noche oscura', () => {
    expect(lightAt(12).alpha).toBe(0);
    expect(lightAt(0).alpha).toBeGreaterThan(0.3);
  });
  it('es continua en el cambio de día y acepta horas fuera de rango', () => {
    expect(lightAt(24)).toEqual(lightAt(0));
    expect(lightAt(-1)).toEqual(lightAt(23));
  });
  it('el atardecer es cálido', () => {
    const l = lightAt(18);
    expect(l.rgb[0]).toBeGreaterThan(l.rgb[2]);
  });
});
