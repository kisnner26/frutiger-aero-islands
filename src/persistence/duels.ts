import type { GameId } from '../features/minigames/rng';
import { supabase } from './supabase';
import { tr } from '../i18n';

export interface Duel {
  id: string;
  game: GameId;
  seed: number;
  challenger: string;
  opponent: string;
  iAmChallenger: boolean;
  myScore: number | null;
  theirScore: number | null;
  status: 'open' | 'done' | 'declined' | 'expired';
  won: boolean;
  tie: boolean;
  expiresAt: string;
}

export interface DuelistRow { username: string; wins: number; losses: number; ties: number }

function client() {
  if (!supabase) throw new Error(tr('los duelos necesitan la comunidad conectada', 'duels need the community to be connected'));
  return supabase;
}

export async function listMyDuels(): Promise<Duel[]> {
  const { data, error } = await client().rpc('my_duels');
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id), game: r.game as GameId, seed: Number(r.seed), challenger: String(r.challenger), opponent: String(r.opponent),
    iAmChallenger: Boolean(r.i_am_challenger), myScore: r.my_score === null ? null : Number(r.my_score), theirScore: r.their_score === null ? null : Number(r.their_score),
    status: r.status as Duel['status'], won: Boolean(r.won), tie: Boolean(r.tie), expiresAt: String(r.expires_at),
  }));
}

export async function createDuel(opponent: string, game: GameId): Promise<string> {
  const { data, error } = await client().rpc('create_duel', { p_opponent: opponent, p_game: game });
  if (error) throw error;
  return String(data);
}

export async function submitDuelScore(id: string, score: number): Promise<void> {
  const { error } = await client().rpc('submit_duel_score', { p_id: id, p_score: Math.round(score) });
  if (error) throw error;
}

export async function declineDuel(id: string): Promise<void> {
  const { error } = await client().rpc('decline_duel', { p_id: id });
  if (error) throw error;
}

export async function duelLeaderboard(): Promise<DuelistRow[]> {
  const { data, error } = await client().rpc('duel_leaderboard');
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({ username: String(r.username), wins: Number(r.wins), losses: Number(r.losses), ties: Number(r.ties) }));
}
