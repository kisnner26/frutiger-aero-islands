import { GRID, cellKey, type CellInfo } from '../world/territory';
import { supabase } from './supabase';

export interface TerritoryMe {
  energy: number;
  maxEnergy: number;
  secondsToNext: number;
  owned: number;
  captured: number;
}
export interface Restoration {
  totalCells: number;
  restoredCells: number;
  percent: number;
  helpers: number;
}
export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  reward: string;
  endsAt: string;
}
export interface Ranked {
  name: string;
  score: number;
  country?: string | null;
}

const client = () => {
  if (!supabase) throw new Error('supabase no está configurado');
  return supabase;
};

type Row = Record<string, unknown>;

/** mapa completo: dueños y avance de restauración por celda. */
export async function loadWorldCells(): Promise<Map<string, CellInfo>> {
  const [parcels, rest] = await Promise.all([client().rpc('world_parcels'), client().rpc('world_restoration')]);
  if (parcels.error) throw parcels.error;
  const map = new Map<string, CellInfo>();
  for (const r of (rest.data ?? []) as Row[]) {
    const cx = Number(r.cx);
    const cy = Number(r.cy);
    map.set(cellKey(cx, cy), { cx, cy, owner: null, country: null, shieldUntil: 0, progress: Number(r.progress) });
  }
  for (const r of (parcels.data ?? []) as Row[]) {
    const cx = Number(r.cx);
    const cy = Number(r.cy);
    if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
    const prev = map.get(cellKey(cx, cy));
    map.set(cellKey(cx, cy), { cx, cy, owner: String(r.owner), country: (r.country as string | null) ?? null, shieldUntil: Date.parse(String(r.shield_until)) || 0, progress: prev?.progress ?? 0 });
  }
  return map;
}

export async function loadMyTerritory(): Promise<TerritoryMe | null> {
  const { data, error } = await client().rpc('my_territory');
  if (error) return null;
  const r = (data as Row[] | null)?.[0];
  return r ? { energy: Number(r.energy), maxEnergy: Number(r.max_energy), secondsToNext: Number(r.seconds_to_next), owned: Number(r.owned), captured: Number(r.captured) } : null;
}

export async function loadRestoration(): Promise<Restoration | null> {
  const { data, error } = await client().rpc('restoration_summary');
  if (error) return null;
  const r = (data as Row[] | null)?.[0];
  return r ? { totalCells: Number(r.total_cells), restoredCells: Number(r.restored_cells), percent: Number(r.percent), helpers: Number(r.helpers) } : null;
}

export async function loadChallenges(): Promise<Challenge[]> {
  const { data, error } = await client().rpc('my_challenges');
  if (error) return [];
  return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id), title: String(r.title), description: String(r.description), goal: Number(r.goal), progress: Number(r.progress), reward: String(r.reward), endsAt: String(r.ends_at) }));
}

export async function loadLeaderboard(kind: 'jugadores' | 'paises' | 'restauradores'): Promise<Ranked[]> {
  if (kind === 'paises') {
    const { data } = await client().rpc('country_leaderboard');
    return ((data ?? []) as Row[]).map((r) => ({ name: String(r.country), score: Number(r.parcels), country: String(r.country) }));
  }
  if (kind === 'restauradores') {
    const { data } = await client().rpc('challenge_leaderboard', { p_id: 'restaura' });
    return ((data ?? []) as Row[]).map((r) => ({ name: String(r.username), score: Number(r.score) }));
  }
  const { data } = await client().rpc('territory_leaderboard');
  return ((data ?? []) as Row[]).map((r) => ({ name: String(r.username), score: Number(r.parcels), country: (r.country as string | null) ?? null }));
}

export async function claimCell(cx: number, cy: number): Promise<string> {
  const { data, error } = await client().rpc('claim_parcel', { p_cx: cx, p_cy: cy });
  if (error) throw error;
  return String((data as Row[])[0]?.action ?? 'claim');
}

export async function restoreCell(cx: number, cy: number): Promise<number> {
  const { data, error } = await client().rpc('restore_parcel', { p_cx: cx, p_cy: cy });
  if (error) throw error;
  return Number((data as Row[])[0]?.progress ?? 0);
}
