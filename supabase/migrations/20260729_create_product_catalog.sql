create table if not exists public.product_catalog (
  id uuid primary key default gen_random_uuid(),

  product_key text not null unique,

  market text not null
    check (market in ('US', 'KR')),

  currency text not null
    check (currency in ('USD', 'KRW')),

  gender text not null
    check (gender in ('MEN', 'WOMEN', 'UNISEX')),

  brand_slug text not null,
  brand_name text not null,

  product_name text not null,
  category_slug text not null,

  source_name text not null,
  source_url text not null,

  image_url text not null,

  original_price numeric,
  sale_price numeric not null,

  discount_percentage integer,

  sale_verification text not null
    check (
      sale_verification in (
        'VERIFIED',
        'UNVERIFIED'
      )
    ),

  is_available boolean not null default true,

  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  product_catalog_market_gender_index
on public.product_catalog (
  market,
  gender
);

create index if not exists
  product_catalog_brand_index
on public.product_catalog (
  brand_slug
);

create index if not exists
  product_catalog_category_index
on public.product_catalog (
  category_slug
);

create index if not exists
  product_catalog_discount_index
on public.product_catalog (
  discount_percentage desc nulls last
);

create index if not exists
  product_catalog_price_index
on public.product_catalog (
  sale_price
);

create index if not exists
  product_catalog_last_seen_index
on public.product_catalog (
  last_seen_at desc
);

alter table public.product_catalog
enable row level security;

drop policy if exists
  "Public can read active products"
on public.product_catalog;

create policy
  "Public can read active products"
on public.product_catalog
for select
using (is_available = true);

create or replace function
  public.set_product_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  set_product_catalog_updated_at
on public.product_catalog;

create trigger
  set_product_catalog_updated_at
before update
on public.product_catalog
for each row
execute function
  public.set_product_catalog_updated_at();
