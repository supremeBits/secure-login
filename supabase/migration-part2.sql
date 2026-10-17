-- Run this ONCE in Supabase: SQL Editor > Create a new snippet > paste > Run
-- It upgrades your existing database. Your current users are kept.

-- 1. Users: four roles, status, and soft delete
alter table public.users drop constraint if exists users_role_check;
update public.users set role = 'staff' where role = 'user';
alter table public.users
  add constraint users_role_check check (role in ('admin', 'manager', 'staff', 'viewer'));
alter table public.users alter column role set default 'staff';
alter table public.users
  add column if not exists status text not null default 'active'
  check (status in ('active', 'disabled'));
alter table public.users add column if not exists deleted_at timestamptz;

-- 2. Tasks (the to-do data)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  title text not null,
  notes text,
  due_date date not null default current_date,
  remind_time time,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_date_idx on public.tasks (user_id, due_date);
alter table public.tasks enable row level security;

-- 3. Settings (the system configuration)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

insert into public.settings (key, value) values
  ('max_login_attempts', '5'),
  ('lockout_minutes', '15'),
  ('session_minutes', '60'),
  ('allow_registration', 'true'),
  ('reminders_enabled', 'true'),
  ('app_name', '"Secure Tasks"')
on conflict (key) do nothing;

-- 4. Restore points (snapshots of the settings only)
create table if not exists public.restore_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  config jsonb not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.restore_points enable row level security;
