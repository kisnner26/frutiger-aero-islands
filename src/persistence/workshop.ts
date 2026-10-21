import { supabase } from './supabase';
import { tr } from '../i18n';

export interface AeroResources { water: number; crystals: number; leaves: number; lastCycleAt: string | null; }
export interface AeroRecipe { id: string; name: string; description: string; waterCost: number; crystalCost: number; leafCost: number; outputKind: 'decoracion' | 'gadget' | 'recuerdo'; outputName: string; unlockLevel: number; }
export interface CraftResult { recipeId: string; outputName: string; amount: number; resources: AeroResources; }

function client() { if (!supabase) throw new Error(tr('la comunidad necesita supabase', 'the community needs supabase')); return supabase; }
function resources(row: { water: number; crystals: number; leaves: number; last_cycle_at?: string | null }): AeroResources { return { water: Number(row.water), crystals: Number(row.crystals), leaves: Number(row.leaves), lastCycleAt: row.last_cycle_at ?? null }; }

export async function getAeroResources(): Promise<AeroResources> {
  const { data, error } = await client().rpc('my_aero_resources');
  if (error) throw error;
  return resources(data?.[0] ?? { water: 0, crystals: 0, leaves: 0 });
}

export async function listAeroRecipes(): Promise<AeroRecipe[]> {
  const { data, error } = await client().from('crafting_recipes').select('id,name,description,water_cost,crystal_cost,leaf_cost,output_kind,output_name,unlock_level').order('unlock_level');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, description: r.description, waterCost: Number(r.water_cost), crystalCost: Number(r.crystal_cost), leafCost: Number(r.leaf_cost), outputKind: r.output_kind as AeroRecipe['outputKind'], outputName: r.output_name, unlockLevel: Number(r.unlock_level) }));
}

export async function claimAeroCycle(): Promise<AeroResources> {
  const { data, error } = await client().rpc('claim_aero_cycle');
  if (error) throw error;
  const row = data?.[0];
  return { water: Number(row?.water ?? 0), crystals: Number(row?.crystals ?? 0), leaves: Number(row?.leaves ?? 0), lastCycleAt: row?.next_cycle_at ?? null };
}

export async function craftAeroRecipe(recipeId: string): Promise<CraftResult> {
  const { data, error } = await client().rpc('craft_aero_recipe', { p_recipe_id: recipeId });
  if (error) throw error;
  const row = data?.[0];
  return { recipeId: row.recipe_id, outputName: row.output_name, amount: Number(row.amount), resources: { water: Number(row.water), crystals: Number(row.crystals), leaves: Number(row.leaves), lastCycleAt: null } };
}
