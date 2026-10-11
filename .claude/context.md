# Project context

Short map of what exists, so you don't have to re-read the code. Keep it terse. Update it after every implementation (see CLAUDE.md).

Last updated: 2026-10-11 · Specs done: 0001

## Stack

Next.js 16 App Router (not the Next you know: read `node_modules/next/dist/docs/`), Tailwind v4, shadcn, Hugeicons, bun, Prettier 4-space, Supabase (Postgres, Realtime), Cloudinary, Upstash Redis, next-intl (bn default, en). Sodepur (Asansol) Durga Puja. Prod: https://sodepur-durga-puja.vercel.app

## Rules that bite

- DB is **shared with production**. Migrations are additive only (new functions/overloads, never change or drop what deployed code uses). Apply via Supabase MCP, mirror in `supabase/migrations/NNNN_*.sql` (latest 0010).
- Writes use server actions + service-role `db()`. Anon can only read public tables. Phones live in `registration_contacts` (private).
- Programme list cache: `unstable_cache`, bump `CACHE_VERSION` in `src/lib/cache.ts` when the Programme shape changes (now "v2").
- Admin area is English-only (nested `NextIntlClientProvider locale="en"`). Admin feedback = sonner toasts via `useActionToast` / `useAdminRun`.
- Redis lock `user:<ip>:<programme>` is fail-open. Stream quota (3 per network) is in Postgres, not Redis. Local test traffic is IP `::1`.
- Test with prod build on port 3140, not the dev server on 3000. Test data prefix `ZZ`, always clean up.

## Public site (`src/app/(site)`)

Home, about, timeline, programmes (+ `[slug]` with registration), results, archive, community, donate, feedback, music.

- **Registration**: individual, team (2-4 members + leader, team name) and pair (brother/sister). Chosen by `programmes.team_format`. Self-edit/withdraw by cookie or phone. Parsing in `src/lib/registration-input.ts`, schemas in `validators.ts`.
- **Music** (`/music`): YouTube library + song requests + **Pandal stream** (visitors request/upvote songs, 3 requests per network, played history with re-request, ask organisers to reset the quota).
- **Brain Games** live quiz: teams, rounds, questions, random team + random question per round (RPC `ask_random_team_question`), leaderboard.
- Musical chair (MP3 via Cloudinary, live broadcast), drawing votes (one per device).

## Admin (`src/app/admin/(protected)`)

Dashboard, programmes (form, registrations, brain-games console, musical-chair console), **Registrations** (all programmes, filter/search, edit/delete any, team-aware), songs, song requests, **Stream** console, feedback, settings, years (editions). Back button on every page below the dashboard (`AdminTitle`).

- **Stream console**: approve/reject requests, play next, skip, volume, wake-lock, quota-reset requests, **add library songs in bulk** (`stream-library.tsx`, RPC `add_stream_songs`), **remove song from playlist** (RPC `remove_stream_song`).

## Tooling

- Skills (manual only: type /name): `spec-driven` (big changes: spec -> plan -> implement), `test-implementation` (independent bun tests).
- Specs in `.claude/specs/NNNN-*.md`. Stop hook formats (prettier) and lints after code changes.
- No automated test suite yet.

## Suggested improvements (for the user to decide)

Claude maintains this list: add items when you notice them, remove them when done or declined.

- Replace remaining native `confirm()` pop-ups (drawings, feedback, song requests, songs, new year, musical chair) with AlertDialog.
- Antakshari and Brother-Sister have no team limit; set `max_participants` when decided.
- Add a global CSV export on the admin Registrations page.
- Add a bun test suite for validators and the stream/registration RPCs (use `test-implementation`).
- Stream plays YouTube only; Cloudinary MP3s can't be streamed.
- Set Upstash Redis env vars (and optional `TRANSLATE_CONTACT_EMAIL`) in Vercel; enable Speed Insights and Analytics.
- Rehearse the pandal stream on a real phone and speaker before the event.
- Delete leftover test registrations ("tt", "Test Team") from Brain Games.
- Portfolio summary (`~/Documents/personal/portfolio/resources/durga-puja-project-summary.md`) is out of date.
