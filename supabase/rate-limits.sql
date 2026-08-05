-- How often one caller may do something.
--
-- Counted here rather than in each serverless instance's memory: a
-- request may land on any instance, so a per-instance counter is a limit
-- an attacker leaves behind simply by being spread across them.
--
-- Fixed windows, one row per caller per window. A caller can send two
-- windows' worth across a boundary, which is the accepted cost of
-- keeping this to a single indexed row rather than a row per request.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  primary key (key, window_start)
);

create index if not exists rate_limits_expires_at_idx
  on public.rate_limits (expires_at);

alter table public.rate_limits enable row level security;

-- Count one action and return the running total for this window.
--
-- Done as a function so the read and the write are a single atomic
-- statement. Selecting the count and then updating it would let two
-- requests arriving together both read the same number and both be
-- allowed, which is exactly the case a limiter exists for.
create or replace function public.bump_rate_limit(
  p_key text,
  p_window_start timestamptz,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count, expires_at)
  values (
    p_key,
    p_window_start,
    1,
    p_window_start + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (key, window_start)
    do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

-- Old windows are never read again. Clearing them opportunistically
-- keeps the table from growing without bound; there is no scheduler
-- here, so this is called from the health check.
create or replace function public.sweep_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits where expires_at < now();

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;
