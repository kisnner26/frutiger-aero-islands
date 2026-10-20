export type ArcadeGame = 'racer' | 'crystals' | 'fish';

export interface RacerState {
  lane: number;
  distance: number;
  suns: number;
  damage: number;
  remaining: number;
  route: number;
}

export const RACER_DURATION = 25;
export const RACER_FINISH = 1_000;

export function initialRacer(route = 1): RacerState {
  return { lane: 1, distance: 0, suns: 0, damage: 0, remaining: RACER_DURATION, route };
}

export function steerRacer(state: RacerState, movement: -1 | 1): RacerState {
  return { ...state, lane: Math.max(0, Math.min(2, state.lane + movement)) };
}

export function tickRacer(state: RacerState, seconds = 1): RacerState {
  if (state.remaining <= 0 || state.damage >= 3 || state.distance >= RACER_FINISH) return state;
  return { ...state, distance: Math.min(RACER_FINISH, state.distance + (76 + state.route * 9) * seconds), remaining: Math.max(0, state.remaining - seconds) };
}

export function racerReward(state: RacerState): number {
  const completed = state.distance >= RACER_FINISH;
  return Math.max(0, state.suns + (completed ? 30 + state.route * 8 : Math.floor(state.distance / 90)) - state.damage * 4);
}

export type Crystal = 'cyan' | 'pink' | 'lime' | 'gold';
export type CrystalGrid = Array<Array<Crystal | null>>;
export const GRID_W = 6;
export const GRID_H = 8;

export function emptyGrid(): CrystalGrid {
  return Array.from({ length: GRID_H }, () => Array<Crystal | null>(GRID_W).fill(null));
}

export function rotateCrystal(crystals: Crystal[]): Crystal[] {
  return crystals.length < 2 ? crystals : [crystals.at(-1)!, ...crystals.slice(0, -1)];
}

export function settleCrystal(grid: CrystalGrid, column: number, crystal: Crystal): CrystalGrid {
  const next = grid.map((row) => [...row]);
  for (let y = GRID_H - 1; y >= 0; y--) {
    if (!next[y][column]) { next[y][column] = crystal; break; }
  }
  return next;
}

export function matchingCells(grid: CrystalGrid): Set<string> {
  const found = new Set<string>();
  const check = (x: number, y: number, dx: number, dy: number) => {
    const color = grid[y]?.[x];
    if (!color) return;
    const run: Array<[number, number]> = [[x, y]];
    for (let nx = x + dx, ny = y + dy; nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && grid[ny][nx] === color; nx += dx, ny += dy) run.push([nx, ny]);
    if (run.length >= 3) run.forEach(([rx, ry]) => found.add(`${rx}:${ry}`));
  };
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) { check(x, y, 1, 0); check(x, y, 0, 1); }
  return found;
}

export function clearMatches(grid: CrystalGrid): { grid: CrystalGrid; cleared: number } {
  const matches = matchingCells(grid);
  if (!matches.size) return { grid, cleared: 0 };
  const next = grid.map((row, y) => row.map((cell, x) => matches.has(`${x}:${y}`) ? null : cell));
  for (let x = 0; x < GRID_W; x++) {
    const stack = next.map((row) => row[x]).filter((cell): cell is Crystal => cell !== null);
    for (let y = GRID_H - 1; y >= 0; y--) next[y][x] = stack.pop() ?? null;
  }
  return { grid: next, cleared: matches.size };
}

export interface Fish { id: number; species: 'blue' | 'gold' | 'clown'; x: number; y: number; caught: boolean; }
export function fishReward(fish: Fish[]): number { return fish.filter((item) => item.caught).reduce((total, item) => total + (item.species === 'gold' ? 10 : item.species === 'clown' ? 6 : 4), 0); }
