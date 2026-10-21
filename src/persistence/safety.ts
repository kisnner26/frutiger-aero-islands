import { clearAll } from './fastcache';
import { signOut } from './session';
import { supabase } from './supabase';
import { tr } from '../i18n';

export const REPORT_REASONS = [
  { id: 'nombre', label: tr('nombre ofensivo', 'offensive name') },
  { id: 'contenido', label: tr('isla con contenido inapropiado', 'island with inappropriate content') },
  { id: 'acoso', label: tr('acoso o mal trato', 'harassment or mistreatment') },
  { id: 'spam', label: tr('spam o engaño', 'spam or deception') },
  { id: 'otro', label: tr('otro motivo', 'other reason') },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

export async function reportUser(username: string, reason: ReportReason, note: string): Promise<void> {
  if (!supabase) throw new Error(tr('los reportes necesitan la comunidad conectada', 'reports need the community to be connected'));
  const { error } = await supabase.rpc('report_user', { p_username: username, p_reason: reason, p_note: note.trim().slice(0, 300) });
  if (error) throw error;
}

/** borra la cuenta y sus datos en el servidor; después cierra la sesión local. */
export async function deleteMyAccount(): Promise<void> {
  if (!supabase) throw new Error(tr('no hay cuenta conectada', 'no account connected'));
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  clearAll();
  try {
    window.localStorage.clear();
  } catch {
    /* sin almacenamiento */
  }
  await signOut().catch(() => undefined);
}
