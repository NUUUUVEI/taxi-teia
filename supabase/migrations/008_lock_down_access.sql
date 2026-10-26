-- ─────────────────────────────────────────────────────────────────────────────
-- Lock down access
--
-- Until now every policy trusted any signed-in user, sign-up was open, and the
-- public could read every booking (names, phones, emails) and the driver's live
-- position. From here on:
--
--   * Only accounts listed in public.drivers can see or change driver data.
--   * The public website never touches bookings or driver_location directly:
--     its server routes use the service role, which bypasses RLS.
--   * Invoice photos live in a private bucket and are read via signed URLs.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── drivers ──────────────────────────────────────────────────────────────────
create table if not exists public.drivers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: only the service role and is_driver() can read it.
alter table public.drivers enable row level security;

create or replace function public.is_driver()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.drivers where user_id = auth.uid())
$$;

revoke all on function public.is_driver() from public, anon;
grant execute on function public.is_driver() to authenticated;

-- Marc's account, plus the developer's for testing. Anyone else is added by hand:
--   insert into public.drivers (user_id) select id from auth.users where email = '...';
insert into public.drivers (user_id)
select id from auth.users where email in ('marctaxiteia@gmail.com', 'immarcnv@gmail.com')
on conflict (user_id) do nothing;

-- Marc's account does not exist yet. Make it a driver the moment it is created
-- in the dashboard, so nobody has to remember the step above.
create or replace function public.grant_driver_to_marc()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email = 'marctaxiteia@gmail.com' then
    insert into public.drivers (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.grant_driver_to_marc() from public, anon, authenticated;

drop trigger if exists grant_driver_to_marc on auth.users;
create trigger grant_driver_to_marc
  after insert on auth.users
  for each row execute function public.grant_driver_to_marc();

-- ── bookings ─────────────────────────────────────────────────────────────────
drop policy if exists "Public read booking slots" on public.bookings;
drop policy if exists "Anonymous can insert bookings" on public.bookings;
drop policy if exists "Driver can update bookings" on public.bookings;
drop policy if exists "Driver can delete bookings" on public.bookings;

-- No insert policy: new bookings only arrive through the website's /api/book
-- route, which validates them and writes with the service role.
create policy "Driver reads bookings"
  on public.bookings for select
  to authenticated
  using (public.is_driver());

create policy "Driver updates bookings"
  on public.bookings for update
  to authenticated
  using (public.is_driver())
  with check (public.is_driver());

create policy "Driver deletes bookings"
  on public.bookings for delete
  to authenticated
  using (public.is_driver());

-- ── expenses ─────────────────────────────────────────────────────────────────
drop policy if exists "Driver full access expenses" on public.expenses;

create policy "Driver full access expenses"
  on public.expenses
  to authenticated
  using (public.is_driver())
  with check (public.is_driver());

-- ── driver_push_tokens ───────────────────────────────────────────────────────
drop policy if exists "Driver manages own token" on public.driver_push_tokens;

create policy "Driver manages own token"
  on public.driver_push_tokens
  to authenticated
  using (auth.uid() = user_id and public.is_driver())
  with check (auth.uid() = user_id and public.is_driver());

-- ── driver_location ──────────────────────────────────────────────────────────
-- The website's availability check now reads this server-side.
drop policy if exists "Anon can read driver location" on public.driver_location;
drop policy if exists "Driver manages own location" on public.driver_location;

create policy "Driver manages own location"
  on public.driver_location
  to authenticated
  using (auth.uid() = user_id and public.is_driver())
  with check (auth.uid() = user_id and public.is_driver());

-- ── booking_attempts ─────────────────────────────────────────────────────────
-- Rate limiting for the public booking form. Holds a salted hash of the
-- caller's IP, never the IP itself. Only the service role touches it.
create table if not exists public.booking_attempts (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_attempts_ip_created
  on public.booking_attempts (ip_hash, created_at);
create index if not exists idx_booking_attempts_created
  on public.booking_attempts (created_at);

alter table public.booking_attempts enable row level security;

-- ── table privileges ─────────────────────────────────────────────────────────
-- RLS decides which rows a role sees, but only once the role may touch the
-- table at all. Grant exactly what each role needs instead of relying on the
-- project's default privileges, which newer Supabase projects no longer give.
revoke all on public.bookings, public.expenses, public.driver_push_tokens,
  public.driver_location, public.drivers, public.booking_attempts
  from anon, authenticated;

grant select on public.service_types to anon, authenticated;
grant select, update, delete on public.bookings to authenticated;
grant select, insert, update, delete on public.expenses,
  public.driver_push_tokens, public.driver_location to authenticated;

grant all on public.service_types, public.bookings, public.expenses,
  public.driver_push_tokens, public.driver_location, public.drivers,
  public.booking_attempts to service_role;
grant usage on all sequences in schema public to service_role;

-- ── invoice storage ──────────────────────────────────────────────────────────
update storage.buckets set public = false where id = 'expense-invoices';

drop policy if exists "Public reads invoices" on storage.objects;
drop policy if exists "Driver uploads invoices" on storage.objects;
drop policy if exists "Driver updates invoices" on storage.objects;
drop policy if exists "Driver deletes invoices" on storage.objects;

create policy "Driver reads invoices"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'expense-invoices' and public.is_driver());

create policy "Driver uploads invoices"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'expense-invoices' and public.is_driver());

create policy "Driver updates invoices"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'expense-invoices' and public.is_driver())
  with check (bucket_id = 'expense-invoices' and public.is_driver());

create policy "Driver deletes invoices"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'expense-invoices' and public.is_driver());

-- Rows used to store the bucket's public URL. Keep only the object path, which
-- the app turns into a short-lived signed URL.
update public.expenses
set invoice_photo_url = regexp_replace(invoice_photo_url, '^.*/expense-invoices/', '')
where invoice_photo_url like '%/expense-invoices/%';
