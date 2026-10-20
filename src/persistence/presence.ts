import { cached } from './fastcache';
import { supabase } from './supabase';

export interface OnlinePlayer {
  username: string;
  displayName: string;
  country: string | null;
  secondsAgo: number;
}

export interface DirectoryPlayer {
  username: string;
  displayName: string;
  country: string | null;
  online: boolean;
}

export interface CountryCount {
  islands: number;
  online: number;
}

type Row = Record<string, unknown>;

/** avisa de que sigues aquí, desde cualquier pantalla (cada minuto mientras la pestaña está visible). */
export async function touchMyPresence(): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('touch_my_presence');
}

export function loadOnlinePlayers(): Promise<OnlinePlayer[]> {
  return cached('online', { ttl: 20_000, stale: true }, async () => {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('online_players');
    if (error) throw error;
    return ((data ?? []) as Row[]).map((r) => ({ username: String(r.username), displayName: String(r.display_name), country: (r.country as string | null) ?? null, secondsAgo: Number(r.seconds_ago) }));
  });
}

/** todos los jugadores (con búsqueda y páginas); los que están en línea salen primero. */
export async function loadDirectory(query: string, offset: number, limit = 30): Promise<{ players: DirectoryPlayer[]; total: number }> {
  if (!supabase) return { players: [], total: 0 };
  const { data, error } = await supabase.rpc('directory_players', { p_query: query.trim().slice(0, 24), p_limit: limit, p_offset: offset });
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  return {
    players: rows.map((r) => ({ username: String(r.username), displayName: String(r.display_name), country: (r.country as string | null) ?? null, online: Boolean(r.online) })),
    total: rows.length ? Number(rows[0].total) : 0,
  };
}

/** islas y personas en línea por país (para que cada zona muestre su número real, no solo las islas cargadas). */
export function loadCountryCounts(): Promise<Record<string, CountryCount>> {
  return cached('paises', { ttl: 60_000, stale: true }, async () => {
    if (!supabase) return {};
    const { data, error } = await supabase.rpc('island_counts_by_country');
    if (error) return {};
    return Object.fromEntries(((data ?? []) as Row[]).map((r) => [String(r.country), { islands: Number(r.islands), online: Number(r.online) }]));
  });
}
