import { describe, expect, it } from 'vitest';
import { bubbleSchedule } from '../src/features/minigames/BubbleRush';
import { memoryDeck, memoryScore } from '../src/features/minigames/MemoryPairs';
import { mulberry32 } from '../src/features/minigames/rng';

describe('minijuegos deterministas (necesario para los duelos)', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('el calendario de burbujas y el reparto de cartas dependen solo de la semilla', () => {
    expect(bubbleSchedule(7)).toEqual(bubbleSchedule(7));
    expect(bubbleSchedule(7)).not.toEqual(bubbleSchedule(8));
    expect(memoryDeck(7)).toEqual(memoryDeck(7));
    expect([...memoryDeck(7)].sort()).toEqual([...memoryDeck(99)].sort());
  });
  it('el puntaje máximo posible respeta el tope del servidor', () => {
    const best = bubbleSchedule(1).reduce((s, b) => s + (b.golden ? 3 : 1), 0);
    expect(best).toBeLessThanOrEqual(100);
    expect(memoryScore(8, 0)).toBeLessThanOrEqual(1000);
    expect(memoryScore(100, 500)).toBe(0);
  });
});
