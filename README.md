# Durga Puja community app

Next.js 16 · Tailwind v4 · shadcn/ui · Hugeicons · Supabase · Cloudinary · next-intl (English / বাংলা)

## Setup

1. **Install**: `bun install`
2. **Supabase**: create a project, then run `supabase/migrations/0001_init.sql` and `supabase/seed.sql` in the SQL editor.
3. **Cloudinary**: create a free account and note the cloud name, API key and API secret.
4. **Env**: copy `.env.example` to `.env.local` and fill it in.
5. **Run**: `bun dev` → http://localhost:3000 · admin at `/admin` (password from `ADMIN_PASSWORD`).

## Scripts

| Command                | What it does              |
| ---------------------- | ------------------------- |
| `bun dev`              | Dev server                |
| `bun run build`        | Production build          |
| `bun run typecheck`    | TypeScript check          |
| `bun run lint`         | ESLint                    |
| `bun run format`       | Prettier (4-space indent) |
| `bun run format:check` | Verify formatting         |

## How things work

- **Public site** lives in `src/app/(site)`, admin in `src/app/admin`. Admin is guarded by `src/proxy.ts` and
  re-checked in every server action with `requireAdmin()`.
- **All writes** go through server actions using the Supabase service-role key. The browser only has the anon key,
  which can read public tables and listen to Realtime. Phone numbers are stored in `registration_contacts`, which
  anon cannot read.
- **Songs**: the music page uses YouTube links (`songs.pool = 'music_page'`). Musical chair uses MP3s uploaded to
  Cloudinary (`pool = 'musical_chair'`).
- **Musical chair console** (`/admin/programmes/<id>/musical-chair`): Space starts a round at a random point in a
  random song and stops at a random moment; the public page mirrors it live via a Realtime broadcast channel.
- **Votes**: one per device per drawing competition (`votes` has `unique(programme_id, voter_hash)`).

## Deploy (Vercel)

Import the repo, add the env vars from `.env.example`, and deploy. Add the Vercel domain to nothing else —
Supabase and Cloudinary need no allow-listing for this setup.
