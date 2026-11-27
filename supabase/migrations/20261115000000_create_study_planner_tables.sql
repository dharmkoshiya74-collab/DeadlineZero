begin;

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  deadline date not null,
  estimated_minutes integer not null check (estimated_minutes between 15 and 10000),
  difficulty text not null default 'medium'
    check (difficulty in ('easy', 'medium', 'hard')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  available_minutes_per_day integer not null default 60
    check (available_minutes_per_day between 15 and 600),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint study_plans_id_user_id_key unique (id, user_id)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null,
  title text not null check (char_length(btrim(title)) > 0),
  scheduled_date date not null,
  duration_minutes integer not null check (duration_minutes between 15 and 600),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  constraint study_sessions_plan_owner_fkey
    foreign key (plan_id, user_id)
    references public.study_plans (id, user_id)
    on delete cascade
);

create index if not exists study_plans_user_deadline_idx
  on public.study_plans (user_id, deadline);

create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, scheduled_date);

alter table public.study_plans enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists study_plans_select_own on public.study_plans;
create policy study_plans_select_own
  on public.study_plans for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists study_plans_insert_own on public.study_plans;
create policy study_plans_insert_own
  on public.study_plans for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists study_plans_update_own on public.study_plans;
create policy study_plans_update_own
  on public.study_plans for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists study_plans_delete_own on public.study_plans;
create policy study_plans_delete_own
  on public.study_plans for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists study_sessions_select_own on public.study_sessions;
create policy study_sessions_select_own
  on public.study_sessions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists study_sessions_insert_own on public.study_sessions;
create policy study_sessions_insert_own
  on public.study_sessions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists study_sessions_update_own on public.study_sessions;
create policy study_sessions_update_own
  on public.study_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists study_sessions_delete_own on public.study_sessions;
create policy study_sessions_delete_own
  on public.study_sessions for delete to authenticated
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.study_plans to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;

notify pgrst, 'reload schema';

commit;
