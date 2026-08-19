-- Add client_email column to bookings
alter table public.bookings
  add column if not exists client_email text;

-- Store driver push tokens for Expo notifications
create table if not exists public.driver_push_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_push_tokens enable row level security;

do $$ begin
  create policy "Driver manages own token"
    on public.driver_push_tokens
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
