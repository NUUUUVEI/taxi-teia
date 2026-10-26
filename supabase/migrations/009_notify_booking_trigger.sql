-- ─────────────────────────────────────────────────────────────────────────────
-- Call notify-booking from a trigger kept in the repo
--
-- The webhook used to be created by hand in the dashboard, which meant it was
-- missing locally, carried the service role key in its definition, and had a
-- typo in its URL ("notify-bookingº") so it never fired successfully.
--
-- Where to call and the shared secret live in Vault, so each environment sets
-- its own and nothing secret is committed:
--   select vault.create_secret('<functions url>/notify-booking', 'notify_booking_url');
--   select vault.create_secret('<random string>', 'notify_booking_secret');
-- The same secret must be set on the function as WEBHOOK_SECRET.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  select decrypted_secret into fn_url
  from vault.decrypted_secrets where name = 'notify_booking_url';
  select decrypted_secret into fn_secret
  from vault.decrypted_secrets where name = 'notify_booking_secret';

  -- Not configured in this environment: never block a booking over it.
  if fn_url is null or fn_secret is null then
    raise warning 'notify_booking_change: vault secrets missing, notification skipped';
    return new;
  end if;

  -- pg_net queues the request and returns at once; the booking commits
  -- whether or not the function answers.
  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', fn_secret
    ),
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;

revoke all on function public.notify_booking_change() from public, anon, authenticated;

-- Replace the dashboard webhook, whatever state it is in.
drop trigger if exists "notify-booking" on public.bookings;
drop trigger if exists notify_booking on public.bookings;

create trigger notify_booking
  after insert or update on public.bookings
  for each row execute function public.notify_booking_change();
