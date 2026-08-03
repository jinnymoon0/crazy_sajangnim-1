-- Photos attached to a contact message: a screenshot of a bug, a photo
-- of a piece someone wants us to stock.
--
-- Storage paths, not URLs. The bucket is private because a screenshot
-- of someone's own screen can carry their email, orders, or anything
-- else they had open; the admin reads them through short-lived signed
-- links instead of addresses that stay good forever.

alter table public.contact_messages
  add column if not exists image_paths text[];

comment on column public.contact_messages.image_paths is
  'Paths inside the contact-images bucket, in the order they were sent';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'contact-images',
  'contact-images',
  false,
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
