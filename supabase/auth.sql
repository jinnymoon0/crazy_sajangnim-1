-- Username/password accounts for the main site, plus the admin allowlist
-- used by the separate crazy-sajangnim-admin app.
--
-- Passwords and security answers are stored as scrypt hashes only; the
-- original values are never persisted anywhere.

create extension if not exists pgcrypto;

create table if not exists public.site_users (
  id uuid primary key default gen_random_uuid(),
  username varchar(30) not null,
  username_lower varchar(30) not null unique,
  password_hash text not null,
  security_question smallint not null,
  security_answer_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,

  constraint site_users_username_format
    check (username ~ '^[A-Za-z0-9._-]{3,30}$'),

  constraint site_users_question_range
    check (security_question between 0 and 3)
);

create table if not exists public.site_sessions (
  id text primary key,
  user_id uuid not null
    references public.site_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists site_sessions_user_idx
  on public.site_sessions (user_id);

create index if not exists site_sessions_expires_idx
  on public.site_sessions (expires_at);

-- Emails allowed to sign in to the separate admin app with Google.
create table if not exists public.admin_emails (
  email text primary key,
  added_by text,
  created_at timestamptz not null default now()
);

insert into public.admin_emails (email, added_by)
values ('illy@extory.co', 'initial setup')
on conflict (email) do nothing;

-- Row level security: these tables are only ever touched through the
-- service role key on the server; no anonymous access of any kind.
alter table public.site_users enable row level security;
alter table public.site_sessions enable row level security;
alter table public.admin_emails enable row level security;
