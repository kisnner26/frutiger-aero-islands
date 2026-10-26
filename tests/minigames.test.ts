import { describe, expect, it } from 'vitest';
import { reflexScore, solesForGame, tugByTime, tugStep } from '../src/features/minigames/logic';

describe('minijuegos nuevos', () => {
  it('reflejos puntúa más con menos milisegundos', () => {
    expect(reflexScore(150)).toBe(100);
    expect(reflexScore(300)).toBe(75);
    expect(reflexScore(600)).toBe(0);
    expect(reflexScore(-5)).toBe(0);
    expect(reflexScore(NaN)).toBe(0);
  });
  it('los soles tienen tope y los versus dan un premio fijo', () => {
    expect(solesForGame('clicks', 10_000)).toBe(60);
    expect(solesForGame('reflex', 500)).toBe(62);
    expect(solesForGame('tug', 0)).toBe(5);
  });
  it('tira y afloja empuja hacia quien toca y termina en el borde', () => {
    expect(tugStep(0, 1).mark).toBe(-4);
    expect(tugStep(0, 2).mark).toBe(4);
    expect(tugStep(-98, 1)).toEqual({ mark: -100, winner: 1 });
    expect(tugByTime(-3)).toBe(1);
    expect(tugByTime(0)).toBeNull();
  });
});
