import type { PlacedObject } from '../domain/island';
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

/** islas de jugadores reales (cuentas con perfil e isla), de la más antigua a la más reciente. no se inventa ninguna. */
export async function listWorldIslands(limit = 32): Promise<RealIsland[]> {
  if (!supabase) return [];
  const query = (cols: string) => supabase!.from('profiles').select(cols).limit(limit);
  let res = await query('username,display_name,country_code,islands!inner(id,layout,created_at)');
  if (res.error) res = await query('username,display_name,islands!inner(id,layout,created_at)'); // sin la columna de país
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as unknown as Row[];
  return rows
    .flatMap((r) => {
      const isl = r.islands?.[0];
      if (!isl || !Array.isArray(isl.layout?.objects)) return [];
      return [{ id: isl.id, username: r.username, displayName: r.display_name, country: r.country_code ?? null, objects: isl.layout!.objects!, level: Math.max(1, Number(isl.layout?.maxLevel) || 1), createdAt: isl.created_at }];
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
