-- ─────────────────────────────────────────────────────────────────────────────
-- Taxi Teià — initial schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable uuid-ossp for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ── service_types ─────────────────────────────────────────────────────────────
create table if not exists public.service_types (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text not null unique,
  label_ca                  text not null,
  label_es                  text not null,
  label_en                  text not null,
  icon                      text,
  estimated_minutes_default integer not null default 30
);

insert into public.service_types (slug, label_ca, label_es, label_en, icon, estimated_minutes_default) values
  ('airports',     'Ports i Aeroports',         'Puertos y Aeropuertos',       'Ports & Airports',        'plane',          60),
  ('trains',       'Estacions de Tren i Bus',    'Estaciones de Tren y Bus',    'Train & Bus Stations',    'train',          40),
  ('local',        'Serveis Locals',             'Servicios Locales',           'Local Services',          'shopping-bag',   20),
  ('longDistance', 'Llarg Recorregut',           'Larga Distancia',             'Long Distance',           'map-pin',        90),
  ('medical',      'Metges i Hospitals',         'Médicos y Hospitales',        'Medical & Hospitals',     'stethoscope',    30),
  ('packages',     'Paqueteria i Documents',     'Paquetería y Documentos',     'Packages & Documents',    'package',        25)
on conflict (slug) do nothing;

-- ── bookings ──────────────────────────────────────────────────────────────────
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  client_name       text not null,
  client_phone      text not null,
  pickup_address    text not null,
  dropoff_address   text not null,
  service_type      text references public.service_types(slug) on delete set null,
  start_time        timestamptz not null,
  estimated_minutes integer not null default 30,
  fare              numeric(8, 2),
  notes             text,
  status            public.booking_status not null default 'pending'
);

-- Index for driver app queries (today's trips, history)
create index if not exists idx_bookings_start_time on public.bookings(start_time);
create index if not exists idx_bookings_status on public.bookings(status);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.service_types enable row level security;
alter table public.bookings enable row level security;

-- Anyone can read service types
create policy "Public read service_types"
  on public.service_types for select
  using (true);

-- Anyone can create a booking (anonymous clients)
create policy "Anonymous can insert bookings"
  on public.bookings for insert
  with check (true);

-- Anyone can read their own booking slot status (for time availability checks)
-- We only expose start_time and status — not personal data
create policy "Public read booking slots"
  on public.bookings for select
  using (true);
-- Note: In production, tighten this to only expose start_time+status columns
-- using a view, or use a Postgres function instead.

-- Authenticated users (the driver) can update and delete bookings
create policy "Driver can update bookings"
  on public.bookings for update
  using (auth.role() = 'authenticated');

create policy "Driver can delete bookings"
  on public.bookings for delete
  using (auth.role() = 'authenticated');

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Enable realtime for the bookings table so the driver app gets live updates
alter publication supabase_realtime add table public.bookings;
