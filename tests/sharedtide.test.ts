import { describe, expect, it } from 'vitest';
import { SharedTide, goalFor } from '../src/features/editor/sharedTide';

describe('SharedTide', () => {
  it('la meta crece con las personas conectadas', () => {
    expect(goalFor(1)).toBe(30);
    expect(goalFor(5)).toBe(90);
  });
  it('quien aporta poco cobra la mitad y el medidor se reinicia', () => {
    const got: number[] = [];
    const t = new SharedTide((r) => got.push(r));
    t.add(2, true);
    t.add(28, false);
    expect(got).toEqual([13]);
    expect(t.state().pops).toBe(0);
  });
  it('quien aporta lo suyo cobra completo', () => {
    const got: number[] = [];
    const t = new SharedTide((r) => got.push(r));
    t.add(10, true);
    t.add(20, false);
    expect(got).toEqual([25]);
  });
});
