-- ── driver_location ──────────────────────────────────────────────────────────
-- Stores the taxi driver's real-time GPS position (one row per driver user)
create table if not exists public.driver_location (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.driver_location enable row level security;

do $$ begin
  create policy "Driver manages own location"
    on public.driver_location
    using  (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- Allow anon read so the website can check driver proximity for booking validation
do $$ begin
  create policy "Anon can read driver location"
    on public.driver_location
    for select
    using (true);
exception when duplicate_object then null;
end $$;

-- ── expenses: add invoice_photo_url ──────────────────────────────────────────
alter table public.expenses
  add column if not exists invoice_photo_url text;
