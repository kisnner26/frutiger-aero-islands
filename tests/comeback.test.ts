import { describe, expect, it } from 'vitest';
import { comebackGift, daysBetween } from '../src/persistence/comeback';

describe('comeback', () => {
  it('cuenta días de calendario', () => {
    expect(daysBetween('2026-10-25', '2026-10-26')).toBe(1);
    expect(daysBetween('2026-10-26', '2026-10-26')).toBe(0);
  });
  it('no hay regalo el mismo día y tiene tope', () => {
    expect(comebackGift(0)).toBe(0);
    expect(comebackGift(1)).toBe(70);
    expect(comebackGift(400)).toBe(190);
  });
});
