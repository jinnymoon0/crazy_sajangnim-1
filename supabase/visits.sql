-- Visits to the shop, including from people who are not signed in.
--
-- The shop no longer asks anyone to log in, so most traffic now leaves
-- no trace on site_users. This records the same details that are kept
-- for a signed-in visit, keyed by a cookie rather than an account.
--
-- A row per visitor per day, not per page view: enough to see how many
-- people came and where from, without keeping a minute-by-minute record
-- of what each of them read.

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),

  -- Random, set in a cookie, meaning nothing on its own. Lets repeat
  -- visits on the same browser be recognised without naming anybody.
  visitor_id uuid not null,

  -- Set when the visitor happens to be signed in, so their browsing can
  -- be read alongside their account.
  user_id uuid
    references public.site_users (id) on delete set null,

  visit_date date not null default (now() at time zone 'utc')::date,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_views integer not null default 1,

  -- Where from.
  ip_address text,
  ip_country text,
  ip_city text,
  ip_region text,
  referrer text,
  landing_path text,

  -- What with.
  user_agent text,
  device_platform text,
  screen_size text,
  timezone text,
  browser_language text,
  cpu_cores integer,
  device_memory_gb numeric,
  connection_type text,

  constraint site_visits_one_row_per_visitor_day
    unique (visitor_id, visit_date)
);

create index if not exists site_visits_visit_date_idx
  on public.site_visits (visit_date desc);

create index if not exists site_visits_user_id_idx
  on public.site_visits (user_id);

-- Reached only through the service role, same as the other tables here.
alter table public.site_visits enable row level security;
