-- Only the Edge Function's server-side secret key can read this allowlist.
create table if not exists public.feedback_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.feedback_admins enable row level security;
revoke all on table public.feedback_admins from anon, authenticated;
grant select on table public.feedback_admins to service_role;
