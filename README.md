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

Copy `.env.example` to `.env` in `apps/mobile` similarly.

### Before going live

Two things are deliberately left as placeholders:

1. **Business identity** — `apps/web/src/lib/site.ts` has `legalName`, `taxId`,
   `registeredAddress` and `taxiLicence` set to `PENDING`. Spanish law (LSSI-CE
   art. 10) requires them on the legal notice page, which currently renders each
   missing field as a visible "to be completed" warning. Fill them in, and update
   `footer.license` in the three `messages/*.json` files (still `VT-XXXXX`).
2. **Car photos** — see below.

The site sets no analytics or advertising cookies, only the language preference,
which is why there is no consent banner and the privacy policy says so. If
analytics are ever added, that claim stops being true and a banner becomes
mandatory.

### Run Dev
```bash
pnpm dev        # starts web on :3000
```

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
supabase functions deploy calculate-duration
supabase functions deploy notify-booking
```

Migration `007_airport_fields.sql` adds `flight_number`, `passengers` and
`luggage` to `bookings`, so `db push` and a redeploy of `notify-booking` have to
happen together — the email template reads those columns.

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
