import { avatarStore } from '../avatar/store';
import { normalizeAvatar } from '../avatar/model';
import { currentSession, supabase } from './supabase';

/**
 * envía el personaje al perfil remoto (función set_my_avatar). devuelve un mensaje de error legible o null.
 * contrato sql: supabase/migrations/202610200005_avatar.sql (pendiente de aplicar). sin cuenta no hace nada.
 */
export async function pushAvatar(): Promise<string | null> {
  if (!supabase) return null;
  const session = await currentSession();
  if (!session) return null;
  const { error } = await supabase.rpc('set_my_avatar', { p_avatar: avatarStore.get() });
  return error ? error.message : null;
}

/** con cuenta, el personaje del perfil manda; si solo hay uno local, se envía. */
export async function syncAvatar(): Promise<void> {
  if (!supabase) return;
  const session = await currentSession();
  if (!session) return;
  avatarStore.setAccount(session.user.id);
  const { data, error } = await supabase.from('profiles').select('avatar').eq('id', session.user.id).maybeSingle();
  if (error || !data) return;
  const remote = (data as { avatar: unknown }).avatar;
  if (remote && typeof remote === 'object') avatarStore.set(normalizeAvatar(remote));
  else if (avatarStore.hasCustom()) await pushAvatar();
}
