-- Isolated database only: requires auth.uid() test stub and islands fixture.
-- The migration is tested as PL/pgSQL, not by matching its source text.
do $$
declare
  island uuid := '00000000-0000-0000-0000-000000000001';
  owner_id uuid := '00000000-0000-0000-0000-000000000002';
  layout jsonb := '{"objects":[],"brillos":0,"maxLevel":1,"stats":{"pops":0,"bestCombo":0}}';
  invalid jsonb;
  field text;
begin
  perform set_config('test.uid', owner_id::text, false);
  foreach field in array array['objects','brillos','maxLevel','stats'] loop
    invalid := layout - field;
    begin
      perform public.save_island(island, 0, invalid);
      raise exception 'accepted missing field %', field;
    exception when sqlstate '22023' then null;
    end;
    begin
      perform public.save_island(island, 0, jsonb_set(layout, array[field], 'null'));
      raise exception 'accepted JSON null field %', field;
    exception when sqlstate '22023' then null;
    end;
  end loop;
  foreach field in array array['pops','bestCombo'] loop
    begin
      perform public.save_island(island, 0, layout #- array['stats',field]);
      raise exception 'accepted missing stat %', field;
    exception when sqlstate '22023' then null;
    end;
  end loop;
  begin
    perform public.save_island(island, null, layout);
    raise exception 'accepted null revision';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.save_island(island, 0, jsonb_set(layout, '{objects}', '[{"id":"x"}]'));
    raise exception 'accepted incomplete object';
  exception when sqlstate '22023' then null;
  end;
  perform set_config('test.uid','00000000-0000-0000-0000-000000000003',false);
  begin
    perform public.save_island(island,0,layout);
    raise exception 'accepted other owner';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('test.uid','',false);
  begin
    perform public.save_island(island,0,layout);
    raise exception 'accepted anonymous writer';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('test.uid',owner_id::text,false);
  perform public.save_island(island,0,layout);
  if (select revision from public.islands where id=island) <> 1 then
    raise exception 'valid owner save did not increment revision';
  end if;
  begin
    perform public.save_island(island,0,layout);
    raise exception 'accepted stale revision';
  exception when sqlstate '40001' then null;
  end;
end $$;
