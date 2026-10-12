-- A standalone, public feedback intake. Only inserts are exposed to visitors;
-- feedback contents and uploaded files remain private for internal review.
create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  person_name text not null check (char_length(btrim(person_name)) between 2 and 100),
  email text not null check (char_length(email) between 3 and 254),
  category text not null check (category in ('UI/UX', 'Questionnaire', 'Workflow', 'Results', 'Other')),
  feedback_text text not null check (char_length(btrim(feedback_text)) between 20 and 4000),
  attachment_paths text[] not null default '{}' check (cardinality(attachment_paths) <= 3),
  source_url text check (source_url is null or char_length(source_url) <= 2048)
);

create index if not exists product_feedback_created_at_idx on public.product_feedback (created_at desc);
create index if not exists product_feedback_category_idx on public.product_feedback (category);
create index if not exists product_feedback_person_name_idx on public.product_feedback (lower(person_name));
create index if not exists product_feedback_email_idx on public.product_feedback (lower(email));

alter table public.product_feedback enable row level security;
revoke all on table public.product_feedback from anon, authenticated;
grant insert on table public.product_feedback to anon, authenticated;

drop policy if exists "Anyone can submit product feedback" on public.product_feedback;
create policy "Anyone can submit product feedback"
  on public.product_feedback
  for insert
  to anon, authenticated
  with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feedback-attachments',
  'feedback-attachments',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors can upload feedback attachments" on storage.objects;
create policy "Visitors can upload feedback attachments"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'feedback-attachments'
    and (storage.foldername(name))[1] = 'submissions'
  );
