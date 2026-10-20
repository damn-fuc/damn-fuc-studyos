-- StudyOS business schema. Dates are local calendar dates selected by the owner;
-- created_at and updated_at remain UTC-capable timestamptz values.

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  timezone text not null default 'Asia/Shanghai' check (char_length(timezone) between 1 and 64),
  weekly_goal_minutes integer not null default 600 check (weekly_goal_minutes >= 0),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text not null default '',
  kind text not null default 'learning' check (kind in ('learning', 'research')),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  goal text not null default '',
  external_links jsonb not null default '[]'::jsonb check (jsonb_typeof(external_links) = 'array'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_user_id_key unique (id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null default '',
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestones_project_owner_fkey
    foreign key (project_id, user_id) references public.projects (id, user_id) on delete cascade,
  constraint milestones_id_project_user_key unique (id, project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '',
  category text not null default 'other' check (category in ('java', 'ai', 'research', 'other')),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'canceled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  scheduled_date date,
  due_date date,
  completed_at timestamptz,
  project_id uuid,
  milestone_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_milestone_requires_project check (milestone_id is null or project_id is not null),
  constraint tasks_project_owner_fkey
    foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict,
  constraint tasks_milestone_owner_fkey
    foreign key (milestone_id, project_id, user_id)
    references public.milestones (id, project_id, user_id) on delete restrict
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  category text not null check (category in ('java', 'ai', 'research', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  content text not null default '',
  duration_minutes integer not null check (duration_minutes >= 0),
  notes text not null default '',
  project_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_logs_project_owner_fkey
    foreign key (project_id, user_id) references public.projects (id, user_id) on delete restrict
);

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_date date not null,
  wins text not null default '',
  difficulties text not null default '',
  tomorrow_plan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_reviews_user_date_key unique (user_id, review_date)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(dow from week_start) = 1),
  outcomes text not null default '',
  problems text not null default '',
  next_week_goals text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_reviews_user_week_key unique (user_id, week_start)
);

create index projects_user_status_idx on public.projects (user_id, status);
create index milestones_project_owner_idx on public.milestones (project_id, user_id);
create index tasks_user_status_scheduled_idx on public.tasks (user_id, status, scheduled_date);
create index tasks_user_due_idx on public.tasks (user_id, due_date);
create index tasks_user_completed_at_idx on public.tasks (user_id, completed_at desc);
create index tasks_project_owner_idx on public.tasks (project_id, user_id);
create index tasks_milestone_owner_idx on public.tasks (milestone_id, project_id, user_id);
create index activity_logs_user_date_idx on public.activity_logs (user_id, activity_date desc);
create index activity_logs_project_date_idx on public.activity_logs (project_id, user_id, activity_date desc);
create index daily_reviews_user_date_idx on public.daily_reviews (user_id, review_date desc);
create index weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_start desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger milestones_set_updated_at before update on public.milestones
for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create function public.set_task_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      new.completed_at = now();
    else
      new.completed_at = null;
    end if;
  elsif new.status = 'done' and old.status is distinct from 'done' then
      new.completed_at = now();
  else
    new.completed_at = old.completed_at;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at before insert or update of status, completed_at on public.tasks
for each row execute function public.set_task_completed_at();
create trigger activity_logs_set_updated_at before update on public.activity_logs
for each row execute function public.set_updated_at();
create trigger daily_reviews_set_updated_at before update on public.daily_reviews
for each row execute function public.set_updated_at();
create trigger weekly_reviews_set_updated_at before update on public.weekly_reviews
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_logs enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.weekly_reviews enable row level security;

revoke all on table
  public.user_settings,
  public.projects,
  public.milestones,
  public.tasks,
  public.activity_logs,
  public.daily_reviews,
  public.weekly_reviews
from anon, authenticated;

grant select, insert, update, delete on table
  public.user_settings,
  public.projects,
  public.milestones,
  public.tasks,
  public.activity_logs,
  public.daily_reviews,
  public.weekly_reviews
to authenticated;

create policy user_settings_select_own on public.user_settings
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy user_settings_delete_own on public.user_settings
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy projects_select_own on public.projects
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy projects_insert_own on public.projects
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy projects_update_own on public.projects
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy projects_delete_own on public.projects
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy milestones_select_own on public.milestones
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy milestones_insert_own on public.milestones
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy milestones_update_own on public.milestones
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy milestones_delete_own on public.milestones
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy tasks_select_own on public.tasks
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy tasks_insert_own on public.tasks
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy tasks_update_own on public.tasks
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy tasks_delete_own on public.tasks
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy activity_logs_select_own on public.activity_logs
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy activity_logs_insert_own on public.activity_logs
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy activity_logs_update_own on public.activity_logs
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy activity_logs_delete_own on public.activity_logs
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy daily_reviews_select_own on public.daily_reviews
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy daily_reviews_insert_own on public.daily_reviews
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy daily_reviews_update_own on public.daily_reviews
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy daily_reviews_delete_own on public.daily_reviews
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy weekly_reviews_select_own on public.weekly_reviews
for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy weekly_reviews_insert_own on public.weekly_reviews
for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy weekly_reviews_update_own on public.weekly_reviews
for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);
create policy weekly_reviews_delete_own on public.weekly_reviews
for delete to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
