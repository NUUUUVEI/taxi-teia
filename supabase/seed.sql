-- Local development only: `supabase start` and `supabase db reset` run this,
-- `supabase db push` never does.

-- notify-booking as served by `supabase functions serve`, reached from the
-- database container through the local API gateway.
select vault.create_secret(
  'http://supabase_kong_taxi-teia:8000/functions/v1/notify-booking',
  'notify_booking_url'
);
select vault.create_secret('local-webhook-secret', 'notify_booking_secret');
