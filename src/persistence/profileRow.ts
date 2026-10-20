import { cached, invalidate } from './fastcache';
import { supabase } from './supabase';

export interface ProfileRow {
  username: string | null;
  country_code: string | null;
  avatar: unknown;
}

/** una sola consulta con lo que necesitan la sesión, el país y el personaje (antes eran tres, una por módulo). */
export async function myProfileRow(userId: string): Promise<ProfileRow | null> {
  const row = await cached(`perfil:${userId}`, { ttl: 30_000 }, async () => {
    if (!supabase) return null;
    for (const cols of ['username,country_code,avatar', 'username,country_code', 'username']) {
      const { data, error } = await supabase.from('profiles').select(cols).eq('id', userId).maybeSingle();
      if (!error) {
        if (!data) return null;
        const r = data as unknown as Partial<ProfileRow>;
        return { username: r.username ?? null, country_code: r.country_code ?? null, avatar: r.avatar ?? null };
      }
    }
    return null;
  });
  if (!row) invalidate('perfil:'); // un perfil que aún no existe no debe quedarse en caché
  return row;
}

export const forgetProfileRow = () => invalidate('perfil:');
