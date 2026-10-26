/** marea compartida: todas las personas conectadas revientan burbujas y llenan juntas un mismo medidor. */
export const BASE_GOAL = 30;
export const GOAL_PER_PLAYER = 18;
export const TEAM_REWARD = 25;
/** quien aportó al menos esto cuando se llena cobra el premio completo; el resto, la mitad. */
export const FULL_SHARE = 5;

export const goalFor = (players: number) => Math.max(BASE_GOAL, Math.max(1, players) * GOAL_PER_PLAYER);

export interface TideState {
  pops: number;
  mine: number;
  goal: number;
  filled: number;
}

export class SharedTide {
  private pops = 0;
  private mine = 0;
  private filled = 0;
  private players = 1;

  constructor(private onFill: (reward: number, filled: number) => void) {}

  setPlayers(n: number) {
    this.players = Math.max(1, n);
  }

  /** suma reventones; own = true si fueron de esta persona. */
  add(n: number, own: boolean) {
    this.pops += n;
    if (own) this.mine += n;
    const goal = goalFor(this.players);
    if (this.pops >= goal) {
      const reward = this.mine >= FULL_SHARE ? TEAM_REWARD : Math.ceil(TEAM_REWARD / 2);
      this.filled++;
      this.pops = 0;
      this.mine = 0;
      this.onFill(reward, this.filled);
    }
  }

  state(): TideState {
    return { pops: this.pops, mine: this.mine, goal: goalFor(this.players), filled: this.filled };
  }
}
