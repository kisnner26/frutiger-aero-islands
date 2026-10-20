-- bucle inicial de progreso: recursos de cuenta, ciclo aero seguro y recetas persistentes.
create table public.crafting_recipes (
  id text primary key,
  name text not null,
  description text not null,
  water_cost integer not null check (water_cost >= 0),
  crystal_cost integer not null check (crystal_cost >= 0),
  leaf_cost integer not null check (leaf_cost >= 0),
  output_kind text not null check (output_kind in ('decoracion', 'gadget', 'recuerdo')),
  output_name text not null,
  unlock_level integer not null default 1 check (unlock_level >= 1)
);

create table public.player_resources (
  user_id uuid primary key references auth.users(id) on delete cascade,
  water integer not null default 0 check (water >= 0),
  crystals integer not null default 0 check (crystals >= 0),
  leaves integer not null default 0 check (leaves >= 0),
  last_cycle_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.crafted_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.crafting_recipes(id) on delete restrict,
  amount integer not null default 0 check (amount >= 0),
  crafted_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

insert into public.crafting_recipes (id, name, description, water_cost, crystal_cost, leaf_cost, output_kind, output_name, unlock_level) values
  ('bubble-lantern', 'farol de burbuja', 'una luz acuática para las noches de isla', 18, 3, 6, 'decoracion', 'farol de burbuja', 1),
  ('reef-terrarium', 'terrario de arrecife', 'un micro arrecife de cristal vivo', 26, 8, 12, 'decoracion', 'terrario de arrecife', 2),
  ('cloud-postcard', 'postal de nube', 'recuerdo coleccionable de una ruta aérea', 12, 5, 4, 'recuerdo', 'postal de nube', 1),
  ('wave-battery', 'batería wave', 'carga especial para tus gadgets aero', 32, 12, 8, 'gadget', 'batería wave', 3)
on conflict (id) do update set
  name = excluded.name, description = excluded.description, water_cost = excluded.water_cost,
  crystal_cost = excluded.crystal_cost, leaf_cost = excluded.leaf_cost,
  output_kind = excluded.output_kind, output_name = excluded.output_name, unlock_level = excluded.unlock_level;

alter table public.crafting_recipes enable row level security;
alter table public.player_resources enable row level security;
alter table public.crafted_items enable row level security;
revoke all on public.crafting_recipes, public.player_resources, public.crafted_items from anon, authenticated;
grant select on public.crafting_recipes to anon, authenticated;
create policy "public recipes" on public.crafting_recipes for select using (true);

create or replace function public.my_aero_resources()
returns table (water integer, crystals integer, leaves integer, last_cycle_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  insert into public.player_resources (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return query select r.water, r.crystals, r.leaves, r.last_cycle_at from public.player_resources r where r.user_id = auth.uid();
end;
$$;

create or replace function public.claim_aero_cycle()
returns table (water integer, crystals integer, leaves integer, next_cycle_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  insert into public.player_resources (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.player_resources r
    set water = r.water + 18, crystals = r.crystals + 4, leaves = r.leaves + 9,
        last_cycle_at = now(), updated_at = now()
    where r.user_id = auth.uid()
      and (r.last_cycle_at is null or r.last_cycle_at <= now() - interval '6 hours')
    returning r.water, r.crystals, r.leaves, r.last_cycle_at + interval '6 hours'
    into water, crystals, leaves, next_cycle_at;
  if not found then raise exception 'el ciclo aero vuelve en unas horas' using errcode = '22023'; end if;
  return next;
end;
$$;

create or replace function public.craft_aero_recipe(p_recipe_id text)
returns table (recipe_id text, output_name text, amount integer, water integer, crystals integer, leaves integer)
language plpgsql security definer set search_path = '' as $$
declare v_recipe public.crafting_recipes%rowtype; v_item_amount integer;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  select * into v_recipe from public.crafting_recipes where id = p_recipe_id;
  if not found then raise exception 'receta no encontrada' using errcode = 'P0002'; end if;
  insert into public.player_resources (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.player_resources r
    set water = r.water - v_recipe.water_cost,
        crystals = r.crystals - v_recipe.crystal_cost,
        leaves = r.leaves - v_recipe.leaf_cost,
        updated_at = now()
    where r.user_id = auth.uid()
      and r.water >= v_recipe.water_cost and r.crystals >= v_recipe.crystal_cost and r.leaves >= v_recipe.leaf_cost
    returning r.water, r.crystals, r.leaves into water, crystals, leaves;
  if not found then raise exception 'no tienes recursos suficientes' using errcode = '22023'; end if;
  insert into public.crafted_items (user_id, recipe_id, amount) values (auth.uid(), v_recipe.id, 1)
    on conflict (user_id, recipe_id) do update set amount = public.crafted_items.amount + 1, crafted_at = now()
    returning crafted_items.amount into v_item_amount;
  recipe_id := v_recipe.id; output_name := v_recipe.output_name; amount := v_item_amount;
  return next;
end;
$$;

revoke all on function public.my_aero_resources() from public;
revoke all on function public.claim_aero_cycle() from public;
revoke all on function public.craft_aero_recipe(text) from public;
grant execute on function public.my_aero_resources(), public.claim_aero_cycle(), public.craft_aero_recipe(text) to authenticated;
