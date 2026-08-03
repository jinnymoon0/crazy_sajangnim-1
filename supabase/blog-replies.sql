-- 대댓글: replies to a comment.
--
-- One level deep. A reply always hangs off a top-level comment, so a
-- reply to a reply joins the same thread rather than starting a deeper
-- one — the API enforces that by walking up to the root before saving.
-- Threads that nest without limit are hard to read on a phone and
-- harder to keep tidy.
--
-- Deleting a comment takes its replies with it; a reply with nothing to
-- answer reads as a non sequitur.

alter table public.blog_comments
  add column if not exists parent_id uuid
    references public.blog_comments (id) on delete cascade;

create index if not exists blog_comments_parent_id_idx
  on public.blog_comments (parent_id);
