begin;

create extension if not exists pgtap with schema extensions;
select plan(62);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner-one@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'owner-two@example.test');

insert into public.projects (id, user_id, name) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Test Project One'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Test Project Two');

insert into public.milestones (id, project_id, user_id, title) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Milestone One'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Milestone Two');

insert into public.tasks (id, user_id, title, project_id, milestone_id) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111', 'Task One', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '22222222-2222-4222-8222-222222222222', 'Task Two', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');

insert into public.activity_logs (id, user_id, activity_date, category, title, duration_minutes, project_id) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', '2026-10-18', 'java', 'Activity One', 25, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', '22222222-2222-4222-8222-222222222222', '2026-10-18', 'ai', 'Activity Two', 30, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');

insert into public.daily_reviews (id, user_id, review_date, wins) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', '2026-10-18', 'Test note one'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', '22222222-2222-4222-8222-222222222222', '2026-10-18', 'Test note two');

insert into public.weekly_reviews (id, user_id, week_start, outcomes) values
  ('ffffffff-ffff-4fff-8fff-fffffffffff1', '11111111-1111-4111-8111-111111111111', '2026-10-12', 'Test outcomes one'),
  ('ffffffff-ffff-4fff-8fff-fffffffffff2', '22222222-2222-4222-8222-222222222222', '2026-10-12', 'Test outcomes two');

insert into public.user_settings (id, user_id) values
  ('99999999-9999-4999-8999-999999999992', '22222222-2222-4222-8222-222222222222');

select ok((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), 'projects has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.milestones'::regclass), 'milestones has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.tasks'::regclass), 'tasks has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.activity_logs'::regclass), 'activity_logs has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.daily_reviews'::regclass), 'daily_reviews has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.weekly_reviews'::regclass), 'weekly_reviews has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.user_settings'::regclass), 'user_settings has RLS enabled');

select ok(not has_table_privilege('anon', 'public.projects', 'select'), 'anon cannot select projects');
select ok(not has_table_privilege('anon', 'public.milestones', 'select'), 'anon cannot select milestones');
select ok(not has_table_privilege('anon', 'public.tasks', 'select'), 'anon cannot select tasks');
select ok(not has_table_privilege('anon', 'public.activity_logs', 'select'), 'anon cannot select activity_logs');
select ok(not has_table_privilege('anon', 'public.daily_reviews', 'select'), 'anon cannot select daily_reviews');
select ok(not has_table_privilege('anon', 'public.weekly_reviews', 'select'), 'anon cannot select weekly_reviews');
select ok(not has_table_privilege('anon', 'public.user_settings', 'select'), 'anon cannot select user_settings');

select ok(has_table_privilege('authenticated', 'public.projects', 'select'), 'authenticated can reach projects policies');
select ok(has_table_privilege('authenticated', 'public.milestones', 'select'), 'authenticated can reach milestones policies');
select ok(has_table_privilege('authenticated', 'public.tasks', 'select'), 'authenticated can reach tasks policies');
select ok(has_table_privilege('authenticated', 'public.activity_logs', 'select'), 'authenticated can reach activity_logs policies');
select ok(has_table_privilege('authenticated', 'public.daily_reviews', 'select'), 'authenticated can reach daily_reviews policies');
select ok(has_table_privilege('authenticated', 'public.weekly_reviews', 'select'), 'authenticated can reach weekly_reviews policies');
select ok(has_table_privilege('authenticated', 'public.user_settings', 'select'), 'authenticated can reach user_settings policies');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq('select count(*) from public.projects', array[1::bigint], 'owner sees only own projects');
select results_eq('select count(*) from public.milestones', array[1::bigint], 'owner sees only own milestones');
select results_eq('select count(*) from public.tasks', array[1::bigint], 'owner sees only own tasks');
select results_eq('select count(*) from public.activity_logs', array[1::bigint], 'owner sees only own activity logs');
select results_eq('select count(*) from public.daily_reviews', array[1::bigint], 'owner sees only own daily reviews');
select results_eq('select count(*) from public.weekly_reviews', array[1::bigint], 'owner sees only own weekly reviews');
select results_eq('select count(*) from public.user_settings', array[0::bigint], 'owner cannot see another user settings');

select lives_ok($$insert into public.projects (user_id, name) values ('11111111-1111-4111-8111-111111111111', 'New Project')$$, 'owner can create own project');
select lives_ok($$insert into public.milestones (project_id, user_id, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'New Milestone')$$, 'owner can create own milestone');
select lives_ok($$insert into public.tasks (user_id, title, project_id, milestone_id) values ('11111111-1111-4111-8111-111111111111', 'New Task', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')$$, 'owner can create own task');
select lives_ok($$insert into public.activity_logs (user_id, activity_date, category, title, duration_minutes) values ('11111111-1111-4111-8111-111111111111', '2026-10-19', 'java', 'New Activity', 15)$$, 'owner can create own activity');
select lives_ok($$insert into public.daily_reviews (user_id, review_date, wins) values ('11111111-1111-4111-8111-111111111111', '2026-10-19', 'New Review')$$, 'owner can create own daily review');
select lives_ok($$insert into public.weekly_reviews (user_id, week_start, outcomes) values ('11111111-1111-4111-8111-111111111111', '2026-10-19', 'New Week')$$, 'owner can create own weekly review');
select lives_ok($$insert into public.user_settings (user_id) values ('11111111-1111-4111-8111-111111111111')$$, 'owner can create own settings');

select throws_ok($$insert into public.projects (user_id, name) values ('22222222-2222-4222-8222-222222222222', 'Foreign Project')$$, '42501', null, 'cannot create project for another user');
select throws_ok($$insert into public.milestones (project_id, user_id, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '22222222-2222-4222-8222-222222222222', 'Foreign Milestone')$$, '42501', null, 'cannot create milestone for another user');
select throws_ok($$insert into public.tasks (user_id, title) values ('22222222-2222-4222-8222-222222222222', 'Foreign Task')$$, '42501', null, 'cannot create task for another user');
select throws_ok($$insert into public.activity_logs (user_id, activity_date, category, title, duration_minutes) values ('22222222-2222-4222-8222-222222222222', '2026-10-19', 'java', 'Foreign Activity', 15)$$, '42501', null, 'cannot create activity for another user');
select throws_ok($$insert into public.daily_reviews (user_id, review_date) values ('22222222-2222-4222-8222-222222222222', '2026-10-19')$$, '42501', null, 'cannot create daily review for another user');
select throws_ok($$insert into public.weekly_reviews (user_id, week_start) values ('22222222-2222-4222-8222-222222222222', '2026-10-26')$$, '42501', null, 'cannot create weekly review for another user');
select throws_ok($$insert into public.user_settings (user_id) values ('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'cannot create settings for another user');

select is((with changed as (update public.projects set name = 'Changed' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user project');
select is((with changed as (update public.milestones set title = 'Changed' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user milestone');
select is((with changed as (update public.tasks set title = 'Changed' where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user task');
select is((with changed as (update public.activity_logs set title = 'Changed' where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user activity');
select is((with changed as (update public.daily_reviews set wins = 'Changed' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user daily review');
select is((with changed as (update public.weekly_reviews set outcomes = 'Changed' where id = 'ffffffff-ffff-4fff-8fff-fffffffffff2' returning id) select count(*) from changed), 0::bigint, 'cannot update another user weekly review');
select is((with changed as (update public.user_settings set display_name = 'Changed' where id = '99999999-9999-4999-8999-999999999992' returning id) select count(*) from changed), 0::bigint, 'cannot update another user settings');

select is((with deleted as (delete from public.projects where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user project');
select is((with deleted as (delete from public.milestones where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user milestone');
select is((with deleted as (delete from public.tasks where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user task');
select is((with deleted as (delete from public.activity_logs where id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user activity');
select is((with deleted as (delete from public.daily_reviews where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user daily review');
select is((with deleted as (delete from public.weekly_reviews where id = 'ffffffff-ffff-4fff-8fff-fffffffffff2' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user weekly review');
select is((with deleted as (delete from public.user_settings where id = '99999999-9999-4999-8999-999999999992' returning id) select count(*) from deleted), 0::bigint, 'cannot delete another user settings');

select throws_ok($$insert into public.activity_logs (user_id, activity_date, category, title, duration_minutes) values ('11111111-1111-4111-8111-111111111111', '2026-10-20', 'java', 'Negative Activity', -1)$$, '23514', null, 'negative study duration is rejected');
select throws_ok($$insert into public.daily_reviews (user_id, review_date) values ('11111111-1111-4111-8111-111111111111', '2026-10-18')$$, '23505', null, 'daily review is unique per user and date');
select throws_ok($$insert into public.weekly_reviews (user_id, week_start) values ('11111111-1111-4111-8111-111111111111', '2026-10-12')$$, '23505', null, 'weekly review is unique per user and week');
select throws_ok($$insert into public.tasks (user_id, title, project_id, milestone_id) values ('11111111-1111-4111-8111-111111111111', 'Cross Project', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2')$$, '23503', null, 'task cannot reference a milestone from another project or user');
select ok((with changed as (update public.tasks set status = 'done' where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1' returning completed_at) select completed_at is not null and completed_at <= now() from changed), 'task completion time is recorded by the database');
select results_eq($$with original as (select completed_at from public.tasks where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'), changed as (update public.tasks set completed_at = '2000-01-01T00:00:00Z' where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1' returning completed_at) select changed.completed_at = original.completed_at from changed, original$$, array[true], 'client cannot rewrite completion time');

select * from finish();
rollback;
