-- Likes on blog posts.
--
-- One like per person per post, enforced by the database rather than by
-- the route, so a double tap or two open tabs cannot count twice.
--
-- The account is held by id, which does not change when someone renames
-- themselves; the username is stored alongside it because that is what
-- the admin's activity list aggregates by, matching posts and comments.

create table if not exists public.blog_post_likes (
  id uuid primary key default gen_random_uuid(),

  post_id uuid not null
    references public.blog_posts (id) on delete cascade,

  user_id uuid not null
    references public.site_users (id) on delete cascade,

  author_name varchar(40) not null,

  created_at timestamptz not null default now(),

  constraint blog_post_likes_one_per_person unique (post_id, user_id)
);

create index if not exists blog_post_likes_post_id_idx
  on public.blog_post_likes (post_id);

create index if not exists blog_post_likes_author_idx
  on public.blog_post_likes (author_name);

-- Reached only through the service role, same as the other blog tables.
alter table public.blog_post_likes enable row level security;
