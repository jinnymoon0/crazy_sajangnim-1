-- Google-login accounts for the main site, plus the admin allowlist
-- used by the separate crazy-sajangnim-admin app.
--
-- Sign-in is Google-only: each account is keyed by the stable Google
-- subject (google_sub) and carries the profile Google shares (email,
-- name, avatar, verified flag). The username is chosen by the user
-- after their first sign-in and may be in any language; only length is
-- enforced here because locale-dependent regex classes are fragile in
-- the database — the API enforces the character rules.
--
-- The password/security-question columns are legacy from the original
-- username/password login and remain nullable for old rows.

create extension if not exists pgcrypto;

create table if not exists public.site_users (
  id uuid primary key default gen_random_uuid(),

  google_sub text unique,
  email text,
  full_name text,
  avatar_url text,
  email_verified boolean,

  username varchar(30),
  username_lower varchar(30) unique,

  -- Legacy password-era columns (unused by Google sign-in).
  password_hash text,
  security_question smallint,
  security_answer_hash text,

  created_at timestamptz not null default now(),
  last_login_at timestamptz,

  constraint site_users_username_length
    check (
      username is null
      or char_length(username) between 2 and 30
    )
);

-- Migration for databases created in the password era:
alter table public.site_users
  add column if not exists google_sub text,
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists email_verified boolean;

alter table public.site_users
  alter column username drop not null,
  alter column username_lower drop not null,
  alter column password_hash drop not null,
  alter column security_question drop not null,
  alter column security_answer_hash drop not null;

create unique index if not exists site_users_google_sub_key
  on public.site_users (google_sub);

-- Sessions are managed by Auth.js cookies now; this legacy table is
-- unused and kept only so old deployments do not error. Safe to drop.
create table if not exists public.site_sessions (
  id text primary key,
  user_id uuid not null
    references public.site_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Emails allowed to sign in to the separate admin app with Google.
create table if not exists public.admin_emails (
  email text primary key,
  added_by text,
  created_at timestamptz not null default now()
);

-- Row level security: these tables are only ever touched through the
-- service role key on the server; no anonymous access of any kind.
alter table public.site_users enable row level security;
alter table public.site_sessions enable row level security;
alter table public.admin_emails enable row level security;
