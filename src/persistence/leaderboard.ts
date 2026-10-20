import { cached } from './fastcache';
import { supabase } from './supabase';

export type Period = 'semana' | 'siempre';

export interface LeaderRow {
  rank: number;
  username: string;
  country: string | null;
  score: number;
  parcels: number;
  restores: number;
  captures: number;
  likes: number;
}

export interface MyRank {
  rank: number | null;
  score: number;
  total: number;
}

type Row = Record<string, unknown>;

/** top 100 (la puntuación se calcula en el servidor con acciones que puede comprobar). */
export function loadTop100(period: Period): Promise<LeaderRow[]> {
  return cached(`top100:${period}`, { ttl: 60_000, stale: true }, async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('leaderboard_top', { p_period: period });
    if (error) throw error;
    return ((data ?? []) as Row[]).map((r) => ({
      rank: Number(r.rank),
      username: String(r.username),
      country: (r.country as string | null) ?? null,
      score: Number(r.score),
      parcels: Number(r.parcels),
      restores: Number(r.restores),
      captures: Number(r.captures),
      likes: Number(r.likes),
    }));
  });
}

export function loadMyRank(period: Period): Promise<MyRank | null> {
  return cached(`toprank:${period}`, { ttl: 60_000, stale: true }, async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('leaderboard_me', { p_period: period });
    if (error) return null;
    const r = (data as Row[] | null)?.[0];
    return r ? { rank: r.rank == null ? null : Number(r.rank), score: Number(r.score), total: Number(r.total) } : null;
  });
}
