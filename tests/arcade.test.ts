import { describe, expect, it } from 'vitest';
import { clearMatches, emptyGrid, fishReward, initialRacer, matchingCells, racerReward, rotateCrystal, settleCrystal, steerRacer, tickRacer } from '../src/features/arcade/arcade';

describe('arcade models', () => {
  it('keeps the racer inside three lanes and rewards a finish', () => {
    let racer = initialRacer(1);
    racer = steerRacer(racer, -1);
    racer = steerRacer(racer, -1);
    expect(racer.lane).toBe(0);
    racer = tickRacer({ ...racer, distance: 990 }, 1);
    expect(racer.distance).toBe(1000);
    expect(racerReward(racer)).toBeGreaterThanOrEqual(30);
  });

  it('rotates and clears three matching crystals', () => {
    expect(rotateCrystal(['cyan', 'pink', 'gold'])).toEqual(['gold', 'cyan', 'pink']);
    let grid = emptyGrid();
    grid = settleCrystal(grid, 0, 'cyan');
    grid = settleCrystal(grid, 1, 'cyan');
    grid = settleCrystal(grid, 2, 'cyan');
    expect(matchingCells(grid).size).toBe(3);
    expect(clearMatches(grid).cleared).toBe(3);
  });

  it('uses higher rewards for rare fish', () => {
    expect(fishReward([{ id: 1, species: 'blue', x: 0, y: 0, caught: true }, { id: 2, species: 'gold', x: 0, y: 0, caught: true }])).toBe(14);
  });
});
