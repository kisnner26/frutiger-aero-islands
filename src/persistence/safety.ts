import { clearAll } from './fastcache';
import { signOut } from './session';
import { supabase } from './supabase';

export const REPORT_REASONS = [
  { id: 'nombre', label: 'nombre ofensivo' },
  { id: 'contenido', label: 'isla con contenido inapropiado' },
  { id: 'acoso', label: 'acoso o mal trato' },
  { id: 'spam', label: 'spam o engaño' },
  { id: 'otro', label: 'otro motivo' },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

export async function reportUser(username: string, reason: ReportReason, note: string): Promise<void> {
  if (!supabase) throw new Error('los reportes necesitan la comunidad conectada');
  const { error } = await supabase.rpc('report_user', { p_username: username, p_reason: reason, p_note: note.trim().slice(0, 300) });
  if (error) throw error;
}

/** borra la cuenta y sus datos en el servidor; después cierra la sesión local. */
export async function deleteMyAccount(): Promise<void> {
  if (!supabase) throw new Error('no hay cuenta conectada');
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
