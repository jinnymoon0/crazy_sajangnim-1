-- Extended per-account metadata captured at login time.
-- Network/location comes from request headers (Vercel geo), device
-- details from the browser after sign-in.

alter table public.site_users
  add column if not exists last_ip text,
  add column if not exists ip_city text,
  add column if not exists ip_region text,
  add column if not exists user_agent text,
  add column if not exists device_platform text,
  add column if not exists screen_size text,
  add column if not exists cpu_cores smallint,
  add column if not exists device_memory_gb numeric,
  add column if not exists connection_type text,
  add column if not exists referrer text;
