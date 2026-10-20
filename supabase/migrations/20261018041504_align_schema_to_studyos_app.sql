-- Align the remote bootstrap schema with the application database types.
-- Column renames preserve data and the migration is also safe on a fresh schema.

alter table public.projects add column if not exists kind text not null default 'learning';
alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects add constraint projects_kind_check check (kind in ('learning', 'research'));
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check (status in ('active', 'paused', 'completed'));
alter table public.projects drop constraint if exists projects_name_check;
alter table public.projects add constraint projects_name_check
  check (char_length(btrim(name)) between 1 and 160);

alter table public.user_settings add column if not exists id uuid default gen_random_uuid();
update public.user_settings set id = gen_random_uuid() where id is null;
alter table public.user_settings alter column id set not null;

do $$
declare
  primary_key_name text;
  primary_key_column text;
begin
  select c.conname, a.attname
    into primary_key_name, primary_key_column
  from pg_constraint c
  join unnest(c.conkey) with ordinality as key_columns(attnum, position) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = key_columns.attnum
  where c.conrelid = 'public.user_settings'::regclass
    and c.contype = 'p'
    and key_columns.position = 1;

  if primary_key_column is distinct from 'id' then
    execute format('alter table public.user_settings drop constraint %I', primary_key_name);
    alter table public.user_settings add constraint user_settings_pkey primary key (id);
    alter table public.user_settings add constraint user_settings_user_id_key unique (user_id);
  end if;
end;
$$;

alter table public.user_settings drop constraint if exists user_settings_display_name_check;
alter table public.user_settings add constraint user_settings_display_name_check
  check (char_length(display_name) <= 80);
alter table public.user_settings drop constraint if exists user_settings_timezone_check;
alter table public.user_settings add constraint user_settings_timezone_check
  check (char_length(timezone) between 1 and 64);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'milestones' and column_name = 'name')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'milestones' and column_name = 'title') then
    alter table public.milestones rename column name to title;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'milestones' and column_name = 'target_date')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'milestones' and column_name = 'due_date') then
    alter table public.milestones rename column target_date to due_date;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tasks' and column_name = 'planned_date')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tasks' and column_name = 'scheduled_date') then
    alter table public.tasks rename column planned_date to scheduled_date;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'daily_reviews' and column_name = 'blockers')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'daily_reviews' and column_name = 'difficulties') then
    alter table public.daily_reviews rename column blockers to difficulties;
  end if;
end;
$$;

alter table public.milestones drop constraint if exists milestones_name_check;
alter table public.milestones drop constraint if exists milestones_title_check;
alter table public.milestones add constraint milestones_title_check
  check (char_length(btrim(title)) between 1 and 160);
alter table public.milestones drop constraint if exists milestones_status_check;
alter table public.milestones add constraint milestones_status_check
  check (status in ('todo', 'doing', 'done'));
alter table public.milestones drop constraint if exists milestones_sort_order_check;
alter table public.milestones add constraint milestones_sort_order_check check (sort_order >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.milestones'::regclass
      and conname = 'milestones_id_project_user_key'
  ) then
    alter table public.milestones
      add constraint milestones_id_project_user_key unique (id, project_id, user_id);
  end if;
end;
$$;

alter table public.tasks drop constraint if exists tasks_title_check;
alter table public.tasks add constraint tasks_title_check
  check (char_length(btrim(title)) between 1 and 200);
alter table public.tasks drop constraint if exists tasks_project_id_user_id_fkey;
alter table public.tasks drop constraint if exists tasks_project_owner_fkey;
alter table public.tasks add constraint tasks_project_owner_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict;
alter table public.tasks drop constraint if exists tasks_milestone_id_user_id_project_id_fkey;
alter table public.tasks drop constraint if exists tasks_milestone_owner_fkey;
alter table public.tasks add constraint tasks_milestone_owner_fkey
  foreign key (milestone_id, project_id, user_id)
  references public.milestones (id, project_id, user_id) on delete restrict;
alter table public.tasks drop column if exists sort_order;

alter table public.activity_logs add column if not exists title text;
update public.activity_logs
  set title = coalesce(nullif(left(btrim(content), 200), ''), 'Study session')
  where title is null or char_length(btrim(title)) = 0;
alter table public.activity_logs alter column title set not null;
alter table public.activity_logs alter column title drop default;
alter table public.activity_logs alter column duration_minutes drop default;
alter table public.activity_logs drop constraint if exists activity_logs_content_check;
alter table public.activity_logs drop constraint if exists activity_logs_title_check;
alter table public.activity_logs add constraint activity_logs_title_check
  check (char_length(btrim(title)) between 1 and 200);
alter table public.activity_logs drop constraint if exists activity_logs_project_id_user_id_fkey;
alter table public.activity_logs drop constraint if exists activity_logs_project_owner_fkey;
alter table public.activity_logs add constraint activity_logs_project_owner_fkey
  foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict;
alter table public.activity_logs drop constraint if exists activity_logs_task_id_user_id_fkey;
alter table public.activity_logs drop column if exists task_id;

alter table public.weekly_reviews drop constraint if exists weekly_reviews_week_start_check;
alter table public.weekly_reviews add constraint weekly_reviews_week_start_check
  check (extract(dow from week_start) = 1);

create index if not exists projects_user_status_idx on public.projects (user_id, status);
create index if not exists milestones_project_owner_idx on public.milestones (project_id, user_id);
create index if not exists tasks_user_status_scheduled_idx on public.tasks (user_id, status, scheduled_date);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_completed_at_idx on public.tasks (user_id, completed_at desc);
create index if not exists tasks_project_owner_idx on public.tasks (project_id, user_id);
create index if not exists tasks_milestone_owner_idx on public.tasks (milestone_id, project_id, user_id);
create index if not exists activity_logs_user_date_idx on public.activity_logs (user_id, activity_date desc);
create index if not exists activity_logs_project_date_idx on public.activity_logs (project_id, user_id, activity_date desc);
create index if not exists daily_reviews_user_date_idx on public.daily_reviews (user_id, review_date desc);
create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_start desc);

create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.completed_at = pg_catalog.now();
    else
      new.completed_at = null;
    end if;
  elsif new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at = pg_catalog.now();
  else
    new.completed_at = old.completed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_completed_at on public.tasks;
create trigger tasks_set_completed_at before insert or update of status, completed_at on public.tasks
for each row execute function public.set_task_completed_at();

revoke all on function public.set_task_completed_at() from public, anon;
grant execute on function public.set_task_completed_at() to authenticated;
