# Taxi Teià — Full-Stack Monorepo

Modern trilingual website + Expo Android driver app for Taxi Teià, based in Teià, Maresme.

## Stack

| Layer | Technology |
|---|---|
| Website | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| 3D Car | @react-three/fiber + @react-three/drei + GSAP ScrollTrigger |
| i18n | next-intl (CA / ES / EN) |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Maps | Google Maps Directions API + Google Places API |
| Mobile | Expo SDK 51 (React Native) |
| Monorepo | Turborepo + pnpm workspaces |

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm 9.x (`npm i -g pnpm`)
- Supabase CLI (`npm i -g supabase`)

### Install
```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` in `apps/web`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_SITE_URL=https://www.taxiteia.com
```

`NEXT_PUBLIC_SITE_URL` is the canonical origin, with no trailing slash. Every
canonical URL, `hreflang` alternate and sitemap entry is built from it, so if it
is wrong Google will index the wrong hostname. Set it in the Vercel project too.
It falls back to the Vercel preview URL when unset.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses row level security, so
it must never gain a `NEXT_PUBLIC_` prefix.

Copy `.env.example` to `.env` in `apps/mobile` similarly.

#### Setting them on Vercel

`.env.local` is gitignored, so Vercel never sees it — every variable above has to
be added under Settings → Environment Variables, for Production *and* Preview.

Two traps worth knowing. `NEXT_PUBLIC_*` values are baked into the bundle at
build time, so adding one does nothing to deployments that already exist: you
have to redeploy afterwards. And without `SUPABASE_SERVICE_ROLE_KEY` the pages
render fine but `POST /api/book` refuses every booking and the availability
check lets every slot through, because only the server may read bookings. If
bookings fail but the pages render, check that key before anything else.

### Before going live

Two things are deliberately left as placeholders:

1. **Business identity** — `apps/web/src/lib/site.ts` has `legalName`, `taxId`,
   `registeredAddress` and `taxiLicence` set to `PENDING`. Spanish law (LSSI-CE
   art. 10) requires them on the legal notice page, which currently renders each
   missing field as a visible "to be completed" warning. Fill them in, and update
   `footer.license` in the three `messages/*.json` files (still `VT-XXXXX`).
2. **Car photos** — see below.
3. **Taxi rates** — `apps/web/src/lib/tariff.ts` holds the official interurban
   tariff shown on `/prices`. Confirm the figures match the current Generalitat
   order before launch, and note that they are revised every January: bump `year`
   and the rates together and the whole page updates itself.

   Two things were left off that page on purpose, both waiting on Marc:

   - **Payment methods.** Nothing on the site claims which are accepted, and
     `paymentAccepted` is absent from the structured data. Once confirmed, add a
     `prices.how.payment` string to the three `messages/*.json` files, list the
     key in `Prices.tsx`, and set `paymentAccepted` in `StructuredData.tsx`.
   - **The round-trip kilometre rule.** Interurban fares appear to count the
     return leg (origin → destination → origin), since the taxi has to get back
     to its own municipality. That roughly doubles what a customer would expect
     from the per-km figure, so it belongs on the page — but it came from a
     single secondary source, so it stays off until Marc confirms how his meter
     actually bills it.

   Whether Marc charges strictly by meter or quotes closed prices for airport
   runs is also still unconfirmed. If he quotes closed prices, `/prices` should
   list them, since that is the number customers care about most.

The site sets no analytics or advertising cookies, only the language preference,
which is why there is no consent banner and the privacy policy says so. If
analytics are ever added, that claim stops being true and a banner becomes
mandatory.

### Run Dev
```bash
pnpm dev        # starts web on :3000, against whatever .env.local points at
```

### Testing locally, without touching live data

Needs Docker Desktop running. From the repo root:

```bash
supabase start                      # local database, migrations and supabase/seed.sql
cp supabase/functions/.env.example supabase/functions/.env   # once; fill it in
supabase functions serve --env-file supabase/functions/.env  # notify-booking
cd apps/web && npm run dev:local    # website on :3000 using the local database
```

The local stack uses ports 553xx (Studio on http://127.0.0.1:55323), so it can
run next to other Supabase projects. Every booking made on
http://localhost:3000 lands in the local database and fires `notify-booking`.
To play the driver, edit the row in Studio: changing `start_time` sends the
"time changed" email, setting `status` to `confirmed` or `cancelled` sends
those emails.

Emails: with `RESEND_API_KEY` empty they are only logged by
`functions serve`. With a key, `EMAIL_OVERRIDE_TO` sends every email to you
instead of the client (subject prefixed `[TEST → real recipient]`), and
`EMAIL_FROM=Taxi Teià <onboarding@resend.dev>` works before taxiteia.com is
verified in Resend.

`supabase stop` shuts it all down.

For the mobile app:
```bash
cd apps/mobile
pnpm expo start
```

### Car photos

The car page uses a scroll-driven photo sequence of the vehicle (white Toyota
Corolla Touring Sports Hybrid 140). **`apps/web/public/images/car/` is currently
empty in git** — the AI-generated placeholders were only ever copied to a local
machine, so the deployed gallery falls back to plain dark panels. Add real photos
and commit them.

Drop four photos into `apps/web/public/images/car/` with these names — `.png` or
`.jpg` both work (the gallery tries `.png` first):

| File | Shot | Notes |
|---|---|---|
| `overview` | Full car, front three-quarter angle | Whole car in frame, wheels to roof |
| `trunk` | Boot open from behind | Show the 596 L load space, ideally with a suitcase in it |
| `doors` | Rear door open, seats visible | Shoot the passenger side, clean interior |
| `engine` | Bonnet open | Or a dashboard/hybrid badge shot if the engine bay looks busy |

Shoot landscape (horizontal), in daylight, ideally overcast or golden hour to avoid
harsh reflections on white paint. The images are cropped with `object-cover` and
overlaid with dark gradients on the left and bottom, so leave the car slightly
right of centre and keep the lower-left area free of important detail.

Do **not** use Toyota press/media photos here: those galleries are licensed
"copyright free for editorial purposes only", which does not cover a commercial
booking site.

### Supabase Setup

```bash
supabase login
supabase link --project-ref your_project_ref
supabase db push
supabase functions deploy notify-booking --no-verify-jwt
```

Function secrets (`supabase secrets set NAME=value`): `RESEND_API_KEY`,
`WEBHOOK_SECRET`, and optionally `EMAIL_FROM`, `EMAIL_OVERRIDE_TO`,
`DRIVER_EMAIL` — see `supabase/functions/.env.example`.

The `notify_booking` trigger (migration 009) reads where to call and the shared
secret from Vault, once per project, in the SQL editor:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify-booking', 'notify_booking_url');
select vault.create_secret('<same value as WEBHOOK_SECRET>', 'notify_booking_secret');
```

Without them bookings still save; they just notify nobody.

Only accounts listed in `public.drivers` can use the driver app. Sign-up is off;
create the account under Authentication → Users, then
`insert into public.drivers (user_id) select id from auth.users where email = '...';`
(`marctaxiteia@gmail.com` is added automatically when created).

Launching on taxiteia.com: see [LAUNCH.md](LAUNCH.md).

## Project Structure

```
taxi-teia/
├── apps/
│   ├── web/          # Next.js website
│   └── mobile/       # Expo driver app
├── packages/
│   ├── db/           # Supabase client + types (shared)
│   └── ui/           # Design tokens (shared)
└── supabase/
    ├── migrations/   # SQL migrations
    └── functions/    # Edge Functions
```
