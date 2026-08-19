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
```

Copy `.env.example` to `.env` in `apps/mobile` similarly.

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

The car page uses a scroll-driven photo sequence (white 2026 Corolla Hybrid):

- `apps/web/public/images/car/overview.png`
- `apps/web/public/images/car/trunk.png`
- `apps/web/public/images/car/doors.png`
- `apps/web/public/images/car/engine.png`

### Supabase Setup

```bash
supabase login
supabase link --project-ref your_project_ref
supabase db push
supabase functions deploy calculate-duration
```

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
