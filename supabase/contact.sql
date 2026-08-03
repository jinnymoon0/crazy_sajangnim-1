-- Messages users send from the shop's "Contact us" box: brand requests,
-- bug reports, and anything else.
--
-- The sender is the signed-in account, kept as a reference rather than
-- a copy so the admin always shows their current username and email. A
-- deleted account leaves its messages behind with no sender, which is
-- why the reference is nullable.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),

  user_id uuid
    references public.site_users (id) on delete set null,

  topic text not null,
  message text not null,

  -- Where it was sent from, for spotting abuse.
  ip_address text,
  user_agent text,

  is_read boolean not null default false,

  created_at timestamptz not null default now(),

  constraint contact_messages_topic_check
    check (topic in ('brand', 'bug', 'other')),

  constraint contact_messages_message_length
    check (char_length(message) between 1 and 2000)
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index if not exists contact_messages_user_id_idx
  on public.contact_messages (user_id);

-- Reached only through the service role, same as the other tables here.
alter table public.contact_messages enable row level security;
