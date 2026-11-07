# GiftStream

TikTok live stream gift transaction tracking dashboard. Monitor incoming and outgoing diamonds in real time, view leaderboards, and watch arbitrary TikTok live targets via the Euler Stream WebSocket API.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 15 Web App                    │
│  (Supabase Auth + TikTok OAuth, Realtime Dashboard)      │
└──────────────────┬──────────────────────────┬───────────┘
                   │                          │
           ┌───────▼────────┐        ┌────────▼─────────┐
           │   Supabase     │        │  Background Worker │
           │   (PostgreSQL)  │◄───────│  (Euler Stream WS) │
           │                 │ insert │  Node.js + ws      │
           └─────────────────┘        └────────────────────┘
```

## Project Structure

| Path | Description |
|---|---|
| `src/` | Vite + React dashboard (dev preview) |
| `src/pages/Index.tsx` | Main dashboard — metrics, feeds, watchlist |
| `src/pages/AuthCallback.tsx` | TikTok OAuth callback (Vite version) |
| `src/lib/supabase.ts` | Supabase client (placeholder keys) |
| `src/lib/auth.tsx` | Auth context provider |
| `src/types/database.ts` | TypeScript schema types |
| `app/auth/callback/route.ts` | Next.js OAuth callback handler (reference) |
| `lib/supabase/server.ts` | Next.js Supabase SSR client (reference) |
| `middleware.ts` | Next.js auth middleware (reference) |
| `supabase/migrations/001_init.sql` | Database schema + RLS + triggers |
| `worker/index.ts` | WebSocket ingestion worker |
| `Dockerfile` | Next.js production image |
| `worker/Dockerfile` | Worker production image |
| `docker-compose.yml` | Orchestrates web + worker services |

## Setup

### 1. Environment

```bash
cp .env.example .env
# Fill in your Supabase URL, anon key, service role key, and Euler API key
```

### 2. Database

Apply the migration to your Supabase project:

```bash
supabase db push
# or manually run supabase/migrations/001_init.sql in the SQL editor
```

### 3. Enable TikTok OAuth

In your Supabase dashboard → Authentication → Providers → enable TikTok and add your TikTok app credentials.

### 4. Run the Web App (Vite dev)

```bash
npm install
npm run dev
```

### 5. Run the Worker

```bash
cd worker
npm install
npm run dev
```

### 6. Production (Docker)

```bash
docker-compose up -d
```

## Design

- **Palette**: Midnight Indigo — deep navy (#0a0a1a) with electric indigo (#4f46e5)
- **Typography**: Sora (headings) + Manrope (body)
- **Theme**: Dark-mode dashboard with glassmorphism accents

## Euler Stream Integration

The worker connects to `wss://ws.eulerstream.com?uniqueId={handle}&apiKey={key}` and listens for `WebcastGiftMessage` events. Gift diamonds are calculated as `diamondCount * repeatCount`. Transactions are batch-inserted into Supabase with a 1.5s / 20-item flush window.
