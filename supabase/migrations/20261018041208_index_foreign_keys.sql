-- Added after the initial remote bootstrap. The next migration replaces these
-- temporary indexes with the canonical indexes used by the checked-in schema.
create index if not exists milestones_project_owner_fk_idx
  on public.milestones (project_id, user_id);
create index if not exists tasks_project_owner_fk_idx
  on public.tasks (project_id, user_id);
create index if not exists tasks_milestone_owner_project_fk_idx
  on public.tasks (milestone_id, user_id, project_id);
create index if not exists activity_logs_project_owner_fk_idx
  on public.activity_logs (project_id, user_id);
