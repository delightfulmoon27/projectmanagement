-- Project management app: schema + RLS
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  impact integer not null default 3 check (impact >= 1 and impact <= 5),
  is_dropped boolean not null default false,
  is_recurring boolean not null default false,
  recur_interval text check (recur_interval in ('daily', 'weekly', 'monthly')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (task_id, depends_on_id)
);

create table if not exists task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tasks_project_id_idx on tasks(project_id);
create index if not exists tasks_user_id_idx on tasks(user_id);
create index if not exists task_dependencies_task_id_idx on task_dependencies(task_id);
create index if not exists task_dependencies_depends_on_id_idx on task_dependencies(depends_on_id);
create index if not exists task_checklist_items_task_id_idx on task_checklist_items(task_id);

alter table projects enable row level security;
alter table tasks enable row level security;
alter table task_dependencies enable row level security;
alter table task_checklist_items enable row level security;

create policy "Users see own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users see own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users see own dependencies" on task_dependencies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users see own checklist items" on task_checklist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: enable change streaming on tasks only (used for desktop/mobile sync)
alter publication supabase_realtime add table tasks;
