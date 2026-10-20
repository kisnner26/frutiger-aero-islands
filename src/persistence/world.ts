import type { PlacedObject } from '../domain/island';
import { cached } from './fastcache';
import { supabase } from './supabase';

/** isla de una persona real registrada, tal como se coloca en el mundo. */
export interface RealIsland {
  id: string;
  username: string;
  displayName: string;
  country: string | null;
  objects: PlacedObject[];
  level: number;
  createdAt: string;
}

interface Row {
  username: string;
  display_name: string;
  country_code?: string | null;
  islands: Array<{ id: string; layout: { objects?: PlacedObject[]; maxLevel?: number } | null; created_at: string }>;
}

interface SummaryRow {
  island_id: string;
  username: string;
  display_name: string;
  country_code: string | null;
  objects: PlacedObject[] | null;
  level: number;
  created_at: string;
}

function mapSummary(row: SummaryRow): RealIsland | null {
  if (!Array.isArray(row.objects)) return null;
  return {
    id: row.island_id,
    username: row.username,
    displayName: row.display_name,
    country: row.country_code,
    objects: row.objects,
    level: Math.max(1, Number(row.level) || 1),
    createdAt: row.created_at,
  };
}

/** islas de jugadores reales (cuentas con perfil e isla), de la más antigua a la más reciente. no se inventa ninguna. */
export function listWorldIslands(limit = 32): Promise<RealIsland[]> {
  return cached(`mundo:${limit}`, { ttl: 45_000, stale: true }, () => fetchWorldIslands(limit));
}

async function fetchWorldIslands(limit: number): Promise<RealIsland[]> {
  if (!supabase) return [];
  const safeLimit = Math.max(1, Math.min(48, Math.floor(limit)));
  const summary = await supabase.rpc('world_island_summaries', { p_limit: safeLimit });
  if (!summary.error) {
    return ((summary.data ?? []) as SummaryRow[])
      .map(mapSummary)
      .filter((island): island is RealIsland => island !== null);
  }

  // compatibilidad mientras se aplica la migración nueva en un proyecto existente.
  const query = (cols: string) => supabase!.from('profiles').select(cols).limit(safeLimit);
  let res = await query('username,display_name,country_code,islands!inner(id,layout,created_at)');
  if (res.error) res = await query('username,display_name,islands!inner(id,layout,created_at)'); // sin la columna de país
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as unknown as Row[];
  return rows
    .flatMap((r) => {
      const isl = Array.isArray(r.islands) ? r.islands[0] : (r.islands as unknown as Row['islands'][number] | undefined);
      if (!isl || !Array.isArray(isl.layout?.objects)) return [];
      return [{ id: isl.id, username: r.username, displayName: r.display_name, country: r.country_code ?? null, objects: isl.layout!.objects!, level: Math.max(1, Number(isl.layout?.maxLevel) || 1), createdAt: isl.created_at }];
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
