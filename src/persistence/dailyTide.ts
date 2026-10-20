import { supabase } from './supabase';

export interface DailyTideStatus {
  streak: number;
  canClaim: boolean;
  lastClaimedOn: string | null;
}

export interface DailyTideClaim extends DailyTideStatus {
  water: number;
  crystals: number;
  leaves: number;
  reward: { water: number; crystals: number; leaves: number };
}

function client() {
  if (!supabase) throw new Error('la comunidad necesita supabase');
  return supabase;
}

export async function getDailyTide(): Promise<DailyTideStatus> {
  const { data, error } = await client().rpc('my_daily_tide');
  if (error) throw error;
  const row = data?.[0];
  return { streak: Number(row?.streak ?? 0), canClaim: Boolean(row?.can_claim), lastClaimedOn: row?.last_claimed_on ?? null };
}

export async function claimDailyTide(): Promise<DailyTideClaim> {
  const { data, error } = await client().rpc('claim_daily_tide');
  if (error) throw error;
  const row = data?.[0];
  return {
    streak: Number(row?.streak ?? 1), canClaim: false, lastClaimedOn: new Date().toISOString().slice(0, 10),
    water: Number(row?.water ?? 0), crystals: Number(row?.crystals ?? 0), leaves: Number(row?.leaves ?? 0),
    reward: { water: Number(row?.reward_water ?? 0), crystals: Number(row?.reward_crystals ?? 0), leaves: Number(row?.reward_leaves ?? 0) },
  };
}
