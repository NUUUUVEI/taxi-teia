-- ── Airport transfer details ─────────────────────────────────────────────────
-- Most of the work is airport runs, so the driver needs to know the flight
-- (to absorb delays) and how many people and bags are coming (the Corolla
-- Touring Sports seats 4 passengers).

alter table public.bookings
  add column if not exists flight_number text;

alter table public.bookings
  add column if not exists passengers smallint default 1;

alter table public.bookings
  add column if not exists luggage smallint default 0;

do $$ begin
  alter table public.bookings
    add constraint bookings_passengers_check
    check (passengers is null or passengers between 1 and 4);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.bookings
    add constraint bookings_luggage_check
    check (luggage is null or luggage between 0 and 8);
exception when duplicate_object then null;
end $$;

-- Flight numbers are entered by hand, so normalise them (BA1234, not ba 1234)
-- before they reach the driver's phone.
create or replace function public.normalise_flight_number()
returns trigger as $$
begin
  if new.flight_number is not null then
    new.flight_number := nullif(upper(regexp_replace(new.flight_number, '\s+', '', 'g')), '');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_normalise_flight_number on public.bookings;
create trigger bookings_normalise_flight_number
  before insert or update on public.bookings
  for each row execute function public.normalise_flight_number();
