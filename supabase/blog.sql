create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  content text not null,
  author_name varchar(40) not null default 'Anonymous',
  image_url text not null,
  image_path text not null,
  created_at timestamptz not null default now(),

  constraint blog_posts_title_length
    check (char_length(title) between 1 and 120),

  constraint blog_posts_content_length
    check (char_length(content) between 1 and 5000),

  constraint blog_posts_author_length
    check (char_length(author_name) between 1 and 40)
);

create index if not exists blog_posts_created_at_idx
  on public.blog_posts (created_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "Anyone can view blog posts"
  on public.blog_posts;

create policy "Anyone can view blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (true);

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.blog_posts (id) on delete cascade,
  author_name varchar(40) not null default 'Anonymous',
  content text not null,
  created_at timestamptz not null default now(),

  constraint blog_comments_content_length
    check (char_length(content) between 1 and 1000),

  constraint blog_comments_author_length
    check (char_length(author_name) between 1 and 40)
);

create index if not exists blog_comments_post_created_idx
  on public.blog_comments (post_id, created_at);

alter table public.blog_comments enable row level security;

drop policy if exists "Anyone can view blog comments"
  on public.blog_comments;

create policy "Anyone can view blog comments"
  on public.blog_comments
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'blog-images',
  'blog-images',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
