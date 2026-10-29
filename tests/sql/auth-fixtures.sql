insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003');
set role authenticated;
select set_config('test.uid','00000000-0000-0000-0000-000000000002',false);
select * from public.complete_profile('audit_ana','Ana');
select set_config('test.uid','00000000-0000-0000-0000-000000000003',false);
select * from public.complete_profile('audit_bob','Bob');
reset role;
update public.islands set id='00000000-0000-0000-0000-000000000001'
 where owner_id='00000000-0000-0000-0000-000000000002';
insert into public.player_resources(user_id,water) values
 ('00000000-0000-0000-0000-000000000002',11),
 ('00000000-0000-0000-0000-000000000003',29);
