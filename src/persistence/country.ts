import { forgetProfileRow, myProfileRow } from './profileRow';
import { currentSession, supabase } from './supabase';
import { countryStore } from '../world/country';

/**
 * sincroniza el país con el perfil remoto si hay cuenta. el servidor decide (una vez cada 30 días);
 * devuelve un mensaje de error legible o null. sin backend o sin sesión no hace nada.
 * contrato sql: supabase/migrations/202610200002_country.sql (pendiente de aplicar).
 */
export async function pushCountry(code: string): Promise<string | null> {
  if (!supabase) return null;
  const session = await currentSession();
  if (!session) return null;
  const { error } = await supabase.rpc('set_my_country', { p_country: code });
  forgetProfileRow();
  return error ? error.message : null;
}

/** trae el país del perfil remoto (fuente de verdad cuando existe) y, si solo hay elección local, la envía. */
export async function syncCountry(): Promise<void> {
  if (!supabase) return;
  const session = await currentSession();
  if (!session) return;
  const row = await myProfileRow(session.user.id);
  if (!row) return;
  const remote = row.country_code;
  if (remote) countryStore.set(remote);
  else {
    const local = countryStore.get();
    if (local) await pushCountry(local);
  }
}
