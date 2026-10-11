-- Run this once in Supabase: SQL Editor > New query > Run
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,          -- bcrypt hash (salt is inside) of HMAC(pepper, password)
  totp_secret_enc text not null,        -- 2FA secret, AES-256-GCM encrypted
  role text not null default 'user' check (role in ('user', 'admin')),
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- Block all direct public access. Only the server (service role key) can read/write.
alter table public.users enable row level security;

-- Private storage bucket for encrypted backups
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
