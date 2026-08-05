-- Replies to a comment.
--
-- A reply hangs off whatever it answers, so answering a reply nests one
-- level deeper and threads read as conversations. The API caps how far
-- that indents; past the limit a reply joins its deepest ancestor still
-- within it, because indentation cannot keep growing on a phone.
--
-- Deleting a comment takes its replies with it; a reply with nothing to
-- answer reads as a non sequitur.

alter table public.blog_comments
  add column if not exists parent_id uuid
    references public.blog_comments (id) on delete cascade;

create index if not exists blog_comments_parent_id_idx
  on public.blog_comments (parent_id);
