-- More about a visit, and a record of what was actually looked at.
--
-- site_visits keeps one row per browser per day: who came, from where,
-- on what. This adds where they came from in campaign terms, a fuller
-- picture of the device, and a separate table holding each thing they
-- opened, so "three page views" can be read as which three.

alter table public.site_visits
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists viewport_size text,
  add column if not exists languages text[],
  add column if not exists max_touch_points integer,
  add column if not exists do_not_track boolean,
  add column if not exists is_returning boolean not null default false;

comment on column public.site_visits.is_returning is
  'This browser had been seen on an earlier day before this visit';

-- Each page or storefront opened, in order.
create table if not exists public.site_page_views (
  id uuid primary key default gen_random_uuid(),

  visitor_id uuid not null,

  user_id uuid
    references public.site_users (id) on delete set null,

  path text not null,
  referrer text,

  -- Which storefront was on screen, where the page has one.
  market text,
  gender text,

  viewed_at timestamptz not null default now()
);

create index if not exists site_page_views_visitor_id_idx
  on public.site_page_views (visitor_id, viewed_at desc);

create index if not exists site_page_views_viewed_at_idx
  on public.site_page_views (viewed_at desc);

alter table public.site_page_views enable row level security;
