-- Tie posts and comments to the account that wrote them, not to the
-- username it had at the time.
--
-- Both tables recorded only author_name, so renaming yourself detached
-- you from your own writing: the edit and delete checks stopped
-- matching, and the admin counted you as two people. Likes already work
-- this way; this brings the other two into line.
--
-- author_name stays as the display name of record for rows whose
-- account has since been deleted, and as the fallback for anything the
-- backfill below cannot match.

alter table public.blog_posts
  add column if not exists user_id uuid
    references public.site_users (id) on delete set null;

alter table public.blog_comments
  add column if not exists user_id uuid
    references public.site_users (id) on delete set null;

-- Match what is already stored back to accounts by their current name.
-- Anyone who renamed themselves before this ran cannot be matched and
-- keeps working off author_name.
update public.blog_posts as p
set user_id = u.id
from public.site_users as u
where p.user_id is null
  and p.author_name is not null
  and u.username = p.author_name;

update public.blog_comments as c
set user_id = u.id
from public.site_users as u
where c.user_id is null
  and c.author_name is not null
  and u.username = c.author_name;

create index if not exists blog_posts_user_id_idx
  on public.blog_posts (user_id);

create index if not exists blog_comments_user_id_idx
  on public.blog_comments (user_id);
