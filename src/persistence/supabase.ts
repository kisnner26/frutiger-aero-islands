import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Doc } from '../features/editor/commands';
import { invalidate } from './fastcache';
import { normalizeAvatar, type AvatarSpec } from '../avatar/model';
import { tr } from '../i18n';
import { CATALOG_MAP } from '../catalog/catalog';
import { resilientFetch } from '../net/resilientFetch';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, key!, { auth: { detectSessionInUrl: true, persistSession: true }, global: { fetch: resilientFetch } }) : null;

interface IslandRow {
  id: string;
  name: string;
  layout: unknown;
  revision: number;
  created_at: string;
}

export interface PublicIsland {
  id: string;
  username: string;
  displayName: string;
  name: string;
  layout: Doc;
  revision: number;
  createdAt: string;
  avatar: AvatarSpec | null;
}

/** una isla por persona: según la consulta, el servidor la devuelve como objeto o como lista de un elemento. */
export function firstOf<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function readableSupabaseError(error: unknown, fallback = tr('no se pudo completar la operación.', 'the operation could not be completed.')): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown };
    for (const candidate of [value.message, value.details, value.hint]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
  }
  return fallback;
}

function asDoc(layout: unknown): Doc | null {
  if (!layout || typeof layout !== 'object') return null;
  const d = layout as Partial<Doc>;
  if (!Array.isArray(d.objects) || !Number.isFinite(d.brillos) || !Number.isFinite(d.maxLevel) || !d.stats) return null;
  return sanitizeDoc(d as Doc);
}

/** el servidor exige enteros >= 0; un decimal heredado de un combo bloqueaba todos los guardados. */
export function sanitizeDoc(d: Doc): Doc {
  const int = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));
  const seen = new Set<string>();
  const objects = (Array.isArray(d.objects) ? d.objects : [])
    .filter((o) => o && CATALOG_MAP.has(o.assetId))
    .slice(0, 150)
    .map((o) => {
      const item = CATALOG_MAP.get(o.assetId)!;
      let id = typeof o.id === 'string' && o.id.length >= 1 && o.id.length <= 80 && !seen.has(o.id) ? o.id : `o-${Math.random().toString(36).slice(2, 12)}`;
      while (seen.has(id)) id += 'x';
      seen.add(id);
      const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
      return {
        ...o,
        id,
        x: Math.min(1000, Math.max(0, Math.round(num(o.x, 500)))),
        y: Math.min(1000, Math.max(0, Math.round(num(o.y, 500)))),
        scale: Math.round(Math.min(2, Math.max(0.7, num(o.scale, 1))) * 100) / 100,
        rotation: item.orientations.includes(o.rotation) ? o.rotation : item.orientations[0],
      };
    });
  return { ...d, objects, brillos: int(d.brillos), stats: { ...d.stats, pops: int(d.stats?.pops), bestCombo: int(d.stats?.bestCombo) } };
}

export async function currentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function completeProfile(username: string, displayName?: string): Promise<PublicIsland> {
  if (!supabase) throw new Error(tr('supabase no está configurado', 'supabase is not configured'));
  const { data, error } = await supabase.rpc('complete_profile', { p_username: username, p_display_name: displayName || null });
  if (error) throw error;
  invalidate('perfil:');
  const row = data?.[0];
  const layout = asDoc(row?.layout);
  if (!row || !layout) throw new Error(tr('la isla inicial no se pudo crear', 'the initial island could not be created'));
  return { id: row.island_id, username: row.username, displayName: row.display_name, name: row.island_name, layout, revision: Number(row.revision), createdAt: new Date().toISOString(), avatar: null };
}

export async function myIsland(): Promise<PublicIsland | null> {
  if (!supabase) return null;
  const session = await currentSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('islands')
    .select('id,name,layout,revision,created_at,profiles!inner(username,display_name,avatar)')
    .eq('owner_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const layout = asDoc(data.layout);
  if (!layout) throw new Error(tr('el diseño remoto no es válido', 'the remote layout is not valid'));
  const p = data.profiles as unknown as { username: string; display_name: string; avatar?: unknown };
  return { id: data.id, username: p.username, displayName: p.display_name, name: data.name, layout, revision: Number(data.revision), createdAt: data.created_at, avatar: p.avatar && typeof p.avatar === 'object' ? normalizeAvatar(p.avatar) : null };
}

export async function saveIsland(id: string, revision: number, layout: Doc): Promise<number> {
  if (!supabase) throw new Error(tr('supabase no está configurado', 'supabase is not configured'));
  const { data, error } = await supabase.rpc('save_island', { p_island_id: id, p_expected_revision: revision, p_layout: sanitizeDoc(layout) });
  if (error) throw error;
  return Number(data?.[0]?.revision);
}

export async function getIsland(username: string): Promise<PublicIsland | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('username,display_name,avatar,islands!inner(id,name,layout,revision,created_at)')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const island = firstOf(data.islands as unknown as IslandRow | IslandRow[]);
  const layout = asDoc(island?.layout);
  if (!island || !layout) return null;
  return { id: island.id, username: data.username, displayName: data.display_name, name: island.name, layout, revision: Number(island.revision), createdAt: island.created_at, avatar: data.avatar && typeof data.avatar === 'object' ? normalizeAvatar(data.avatar) : null };
}

export async function listIslands(query = '', limit = 24): Promise<PublicIsland[]> {
  if (!supabase) return [];
  let q = supabase.from('profiles').select('username,display_name,avatar,islands!inner(id,name,layout,revision,created_at)').order('created_at', { foreignTable: 'islands', ascending: false }).limit(limit);
  if (query.trim()) q = q.ilike('username', `${query.trim().toLowerCase()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const island = firstOf(row.islands as unknown as IslandRow | IslandRow[]);
    const layout = asDoc(island?.layout);
    return island && layout ? [{ id: island.id, username: row.username, displayName: row.display_name, name: island.name, layout, revision: Number(island.revision), createdAt: island.created_at, avatar: row.avatar && typeof row.avatar === 'object' ? normalizeAvatar(row.avatar) : null }] : [];
  });
}
