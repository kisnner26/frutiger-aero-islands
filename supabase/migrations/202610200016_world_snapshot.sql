-- una sola llamada para pintar el mapa de conquista: zonas dañadas, parcelas con dueño, resumen del planeta,
-- energía propia y retos. antes eran cinco consultas seguidas (y cada una cuesta una ida y vuelta al servidor).
create or replace function public.world_snapshot()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'cells', coalesce((
      select jsonb_agg(jsonb_build_object('cx', b.cx, 'cy', b.cy, 'progress', coalesce(r.progress, 0), 'zone', b.zone))
      from public.blight_cells b left join public.parcel_restoration r on r.cx = b.cx and r.cy = b.cy
    ), '[]'::jsonb),
    'parcels', coalesce((
      select jsonb_agg(jsonb_build_object('cx', p.cx, 'cy', p.cy, 'owner', pr.username, 'country', pr.country_code, 'shield_until', p.shield_until))
      from public.parcels p join public.profiles pr on pr.id = p.owner_id
    ), '[]'::jsonb),
    'summary', (select to_jsonb(s) from public.restoration_summary() s),
    'me', case when auth.uid() is null then null else (select to_jsonb(m) from public.my_territory() m) end,
    'challenges', case when auth.uid() is null then '[]'::jsonb
      else coalesce((select jsonb_agg(to_jsonb(c)) from public.my_challenges() c), '[]'::jsonb) end
  );
$$;

revoke all on function public.world_snapshot() from public;
grant execute on function public.world_snapshot() to anon, authenticated;
