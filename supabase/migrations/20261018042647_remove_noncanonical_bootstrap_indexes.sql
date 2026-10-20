alter table public.tasks drop constraint if exists tasks_milestone_owner_fkey;
alter table public.milestones drop constraint if exists milestones_id_user_id_project_id_key;
alter table public.tasks drop constraint if exists tasks_id_user_id_key;
alter table public.tasks add constraint tasks_milestone_owner_fkey
  foreign key (milestone_id, project_id, user_id)
  references public.milestones (id, project_id, user_id) on delete restrict;

drop index if exists public.projects_user_status_updated_idx;
drop index if exists public.milestones_user_project_target_idx;
drop index if exists public.tasks_user_status_due_idx;
drop index if exists public.tasks_user_planned_date_idx;
drop index if exists public.tasks_user_project_status_idx;
drop index if exists public.activity_logs_user_category_date_idx;
drop index if exists public.activity_logs_user_project_idx;
