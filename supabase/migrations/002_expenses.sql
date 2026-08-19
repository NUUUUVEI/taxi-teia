-- ── expenses ─────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  date        date not null,
  category    text not null,
  amount      numeric(10, 2) not null,
  description text
);

create index if not exists idx_expenses_date on public.expenses(date);

alter table public.expenses enable row level security;

-- Authenticated users (driver) can do everything
create policy "Driver full access expenses"
  on public.expenses
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
