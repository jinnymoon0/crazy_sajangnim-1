alter table public.site_users
  add column if not exists given_name text,
  add column if not exists family_name text,
  add column if not exists google_locale text,
  add column if not exists google_hosted_domain text,
  add column if not exists first_login_at timestamptz,
  add column if not exists login_count integer not null default 0,
  add column if not exists browser_language text,
  add column if not exists browser_languages jsonb not null default '[]'::jsonb,
  add column if not exists timezone text,
  add column if not exists country_code varchar(2),
  add column if not exists metadata_updated_at timestamptz;

update public.site_users
set
  first_login_at = coalesce(first_login_at, last_login_at, created_at),
  login_count = case
    when google_sub is not null and login_count < 1 then 1
    else login_count
  end;

create index if not exists site_users_last_login_at_idx
  on public.site_users (last_login_at desc);

create index if not exists site_users_country_code_idx
  on public.site_users (country_code);

create or replace function public.record_google_login(
  p_google_sub text,
  p_email text,
  p_full_name text,
  p_given_name text,
  p_family_name text,
  p_avatar_url text,
  p_email_verified boolean,
  p_google_locale text,
  p_google_hosted_domain text
)
returns public.site_users
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.site_users;
begin
  insert into public.site_users (
    google_sub,
    email,
    full_name,
    given_name,
    family_name,
    avatar_url,
    email_verified,
    google_locale,
    google_hosted_domain,
    first_login_at,
    last_login_at,
    login_count
  )
  values (
    p_google_sub,
    p_email,
    p_full_name,
    p_given_name,
    p_family_name,
    p_avatar_url,
    p_email_verified,
    p_google_locale,
    p_google_hosted_domain,
    now(),
    now(),
    1
  )
  on conflict (google_sub) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    given_name = excluded.given_name,
    family_name = excluded.family_name,
    avatar_url = excluded.avatar_url,
    email_verified = excluded.email_verified,
    google_locale = excluded.google_locale,
    google_hosted_domain = excluded.google_hosted_domain,
    first_login_at = coalesce(
      site_users.first_login_at,
      site_users.last_login_at,
      site_users.created_at,
      now()
    ),
    last_login_at = now(),
    login_count = site_users.login_count + 1
  returning * into result;

  return result;
end;
$$;

revoke all on function public.record_google_login(
  text, text, text, text, text, text, boolean, text, text
) from public;

grant execute on function public.record_google_login(
  text, text, text, text, text, text, boolean, text, text
) to service_role;

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_user_id uuid,
  target_username text,
  target_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
