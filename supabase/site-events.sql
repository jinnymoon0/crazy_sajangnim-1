-- What people do, beyond arriving and opening pages.
--
-- Visits and page views already have their own tables. This is for the
-- things that say whether the site is working as a product rather than
-- as a server: which filters people search with, which retailers they
-- actually leave for, how long the catalog takes to answer, and what
-- failed.
--
-- One table with a kind and a jsonb payload, rather than a table per
-- event. The shapes differ and will keep differing; four narrow tables
-- would mean a migration every time a new thing is worth counting, and
-- the query that matters most — "what happened around this visitor" —
-- is a single ordered read.

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),

  -- 'search' | 'retailer_click' | 'latency' | 'failure'
  kind text not null,

  -- The browser, from the same cookie the visit tables use, so an
  -- event can be tied to a session without needing an account.
  visitor_id text,

  -- Filled in when the person is signed in, and backfilled onto their
  -- earlier rows when they sign in, exactly as visits are.
  user_id uuid references public.site_users (id) on delete set null,

  -- Where it happened, and which storefront was on screen.
  path text,
  market text,
  gender text,

  -- Everything shape-specific: the brands and category for a search,
  -- the retailer and product for a click, the route and status for a
  -- failure.
  metadata jsonb not null default '{}'::jsonb,

  -- Set for latency events, and for anything else worth timing.
  duration_ms integer,

  created_at timestamptz not null default now()
);

-- The three reads the admin actually does: a feed by time, one
-- visitor's trail, and counts for one kind over a period.
create index if not exists site_events_created_at_idx
  on public.site_events (created_at desc);

create index if not exists site_events_kind_created_at_idx
  on public.site_events (kind, created_at desc);

create index if not exists site_events_visitor_idx
  on public.site_events (visitor_id, created_at desc);

create index if not exists site_events_user_idx
  on public.site_events (user_id, created_at desc);

alter table public.site_events enable row level security;

-- No policies: every read and write goes through the service role in
-- the API, as with the other tables here. Analytics rows describe
-- people, so nothing anonymous should reach them.
