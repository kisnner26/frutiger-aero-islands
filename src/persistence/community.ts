import { cached } from './fastcache';
import { supabase } from './supabase';
import { tr } from '../i18n';

export interface IslandSocialStatus { likes: number; favorites: number; isLiked: boolean; isFavorited: boolean; }
export interface WorldPresence { islandId: string; onlineCount: number; }
export interface Expedition { id: string; title: string; kind: 'faro' | 'arrecife' | 'isla_flotante'; region: string; goal: number; progress: number; reward: string; closesAt: string; }
export interface ClubPreview { id: string; slug: string; name: string; motto: string; badge: 'orb' | 'wave' | 'palm' | 'crystal'; }
export interface Gadget { id: string; name: string; kind: 'camera' | 'music' | 'laptop' | 'watch' | 'phone'; description: string; unlockLevel: number; }

function requireClient() { if (!supabase) throw new Error(tr('supabase no está configurado', 'supabase is not configured')); return supabase; }

export async function islandSocialStatus(islandId: string): Promise<IslandSocialStatus> {
  const { data, error } = await requireClient().rpc('island_social_status', { p_island_id: islandId });
  if (error) throw error;
  const row = data?.[0];
  return { likes: Number(row?.likes ?? 0), favorites: Number(row?.favorites ?? 0), isLiked: Boolean(row?.is_liked), isFavorited: Boolean(row?.is_favorited) };
}

export async function toggleIslandLike(islandId: string) { const { data, error } = await requireClient().rpc('toggle_island_like', { p_island_id: islandId }); if (error) throw error; return Boolean(data); }
export async function toggleIslandFavorite(islandId: string) { const { data, error } = await requireClient().rpc('toggle_island_favorite', { p_island_id: islandId }); if (error) throw error; return Boolean(data); }
export async function touchIslandPresence(islandId: string) { const { error } = await requireClient().rpc('touch_island_presence', { p_island_id: islandId }); if (error) throw error; }

export async function worldPresence(): Promise<WorldPresence[]> {
  const { data, error } = await requireClient().rpc('world_presence');
  if (error) throw error;
  return ((data ?? []) as Array<{ island_id: string; online_count: number }>).map((row) => ({ islandId: row.island_id, onlineCount: Number(row.online_count) }));
}

export async function listExpeditions(): Promise<Expedition[]> {
  const { data, error } = await requireClient().from('expeditions').select('id,title,kind,region,goal,progress,reward,closes_at').gt('closes_at', new Date().toISOString()).order('closes_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, title: row.title, kind: row.kind as Expedition['kind'], region: row.region, goal: row.goal, progress: row.progress, reward: row.reward, closesAt: row.closes_at }));
}

export async function contributeToExpedition(expeditionId: string, amount: number) { const { data, error } = await requireClient().rpc('contribute_to_expedition', { p_expedition_id: expeditionId, p_amount: amount }); if (error) throw error; return Number(data); }

export async function listClubs(): Promise<ClubPreview[]> {
  const { data, error } = await requireClient().from('clubs').select('id,slug,name,motto,badge').order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, slug: row.slug, name: row.name, motto: row.motto, badge: row.badge as ClubPreview['badge'] }));
}

export function listGadgets(): Promise<Gadget[]> {
  return cached('gadgets', { ttl: 600_000, stale: true }, fetchGadgets);
}

async function fetchGadgets(): Promise<Gadget[]> {
  const { data, error } = await requireClient().from('gadget_catalog').select('id,name,kind,description,unlock_level').order('unlock_level');
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, kind: row.kind as Gadget['kind'], description: row.description, unlockLevel: row.unlock_level }));
}

export async function myExpeditionContributions(): Promise<Record<string, number>> {
  const { data, error } = await requireClient().rpc('my_expedition_contributions');
  if (error) return {};
  return Object.fromEntries(((data ?? []) as Array<{ expedition_id: string; amount: number }>).map((r) => [r.expedition_id, Number(r.amount)]));
}
