-- Run after ALL migrations, auth-fixtures.sql and save_island.sql.
-- Real non-superuser roles and migrated grants/RLS; auth identity remains a stub.
set role authenticated;
select set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
do $$
declare
  mine uuid := '00000000-0000-0000-0000-000000000001';
  other uuid;
  rev bigint;
  layout jsonb := '{"objects":[],"brillos":0,"maxLevel":1,"stats":{"pops":0,"bestCombo":0}}';
begin
  if current_user <> 'authenticated' then raise exception 'test role is privileged'; end if;
  begin
    perform water from public.player_resources;
    raise exception 'direct economy read accepted';
  exception when insufficient_privilege then null;
  end;
  if (select water from public.my_aero_resources()) <> 11 then raise exception 'resource RPC leaked another owner or lost own row'; end if;
  begin
    update public.player_resources set water=1000000 where user_id=auth.uid();
    raise exception 'direct economy mutation accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.islands set layout='{}' where id=mine;
    raise exception 'direct island mutation accepted';
  exception when insufficient_privilege then null;
  end;
  select id into strict other from public.islands where owner_id='00000000-0000-0000-0000-000000000003';
  begin
    perform public.save_island(other,0,layout);
    raise exception 'cross-owner RPC accepted';
  exception when insufficient_privilege then null;
  end;
  select revision into strict rev from public.islands where id=mine;
  perform public.save_island(mine,rev,layout);
  if (select revision from public.islands where id=mine) <> rev+1 then raise exception 'owner RPC failed'; end if;
end $$;
reset role;
set role anon;
select set_config('test.uid','',false);
do $$
begin
  if current_user <> 'anon' then raise exception 'test role is privileged'; end if;
  if has_function_privilege(current_user,'public.save_island(uuid,bigint,jsonb)','execute') then raise exception 'anonymous RPC execute granted'; end if;
  begin
    perform public.save_island('00000000-0000-0000-0000-000000000001',0,'{}');
    raise exception 'anonymous RPC accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.profiles(id,username,display_name) values ('00000000-0000-0000-0000-000000000004','intruder','Intruder');
    raise exception 'anonymous profile mutation accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
