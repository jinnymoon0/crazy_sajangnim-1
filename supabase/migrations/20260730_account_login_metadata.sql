alter table public.site_users
  add column if not exists first_login_at timestamptz,
  add column if not exists login_count integer not null default 0,
  add column if not exists google_locale text,
  add column if not exists browser_language text,
  add column if not exists browser_languages jsonb not null default '[]'::jsonb,
  add column if not exists timezone text,
  add column if not exists country_code varchar(2),
  add column if not exists metadata_updated_at timestamptz;

update public.site_users
set
  first_login_at = coalesce(first_login_at, last_login_at, created_at),
  login_count = case
    when login_count < 1 then 1
    else login_count
  end
where google_sub is not null;

alter table public.site_users
  add constraint site_users_login_count_nonnegative
  check (login_count >= 0) not valid;

alter table public.site_users
  validate constraint site_users_login_count_nonnegative;

create index if not exists site_users_last_login_at_idx
  on public.site_users (last_login_at desc);

create index if not exists site_users_country_code_idx
  on public.site_users (country_code);
