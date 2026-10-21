/** paintball royale en línea: mismas salas por código que aero royale (supabase realtime, solo difusión y presencia). */
import type { AvatarSpec } from '../../avatar/model';
import type { PlayerInit } from './sim';

export { cleanCode, netAvailable, newRoomCode, RoyaleNet } from '../royale/net';
export type { Member } from '../royale/net';

export interface StateMsg { id: string; x: number; y: number; h: number; hp: number; a: 0 | 1; am: number; f: number }
export type PbMsg =
  | { k: 'start'; seed: number; roster: PlayerInit[]; specs: Record<string, AvatarSpec | null> }
  | { k: 'state'; s: StateMsg }
  | { k: 'bots'; list: StateMsg[] }
  | { k: 'shot'; id: string; x: number; y: number; h: number }
  | { k: 'hit'; victim: string; killer: string }
  | { k: 'dead'; victim: string; killer: string | null };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function packState(p: { id: string; x: number; y: number; heading: number; hp: number; alive: boolean; ammo: number; flash: number }): StateMsg {
  return { id: p.id, x: r1(p.x), y: r1(p.y), h: Math.round(p.heading * 100) / 100, hp: p.hp, a: p.alive ? 1 : 0, am: p.ammo, f: p.flash > 0 ? 1 : 0 };
}
