-- Booking locale + pickup/arrival time mode
alter table public.bookings
  add column if not exists locale text default 'ca';

alter table public.bookings
  add column if not exists time_mode text default 'pickup';

alter table public.bookings
  add column if not exists requested_time timestamptz;

do $$ begin
  alter table public.bookings
    add constraint bookings_time_mode_check
    check (time_mode in ('pickup', 'arrival'));
exception when duplicate_object then null;
end $$;
