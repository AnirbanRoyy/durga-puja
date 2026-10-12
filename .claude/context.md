# Project context

Short map of what exists, so you don't have to re-read the code. Keep it terse. Update it after every implementation (see CLAUDE.md).

Last updated: 2026-10-12 · Specs done: 0001, 0002, 0003 (0004+ not started)

## Stack

Next.js 16 App Router (not the Next you know: read `node_modules/next/dist/docs/`), Tailwind v4, shadcn, Hugeicons, bun, Prettier 4-space, Supabase (Postgres, Realtime), Cloudinary, Upstash Redis, next-intl (bn default, en). Sodepur (Asansol) Durga Puja. Prod: https://sodepur-durga-puja.vercel.app

## Rules that bite

- DB is **shared with production**. Migrations are additive only (new functions/overloads, never change or drop what deployed code uses). Apply via Supabase MCP, mirror in `supabase/migrations/NNNN_*.sql` (latest 0012). Apply the migration **before** merging the PR that needs it (merging 0012 unapplied broke the musical chair page).
- Writes use server actions + service-role `db()`. Anon can only read public tables. Phones live in `registration_contacts` (private).
- Programme list cache: `unstable_cache`, bump `CACHE_VERSION` in `src/lib/cache.ts` when the Programme shape changes (now "v2").
- Admin area is English-only (nested `NextIntlClientProvider locale="en"`). Admin feedback = sonner toasts via `useActionToast` / `useAdminRun`.
- Redis lock `user:<ip>:<programme>` is fail-open. Stream quota (3 per network) is in Postgres, not Redis. Local test traffic is IP `::1`.
- Phone layouts: every `grid` needs a base `grid-cols-1` (or `minmax(0,1fr)`) before `sm:`/`lg:` columns, or one wide child stretches the page sideways. Check at 360px.
- Test with prod build on port 3140, not the dev server on 3000. Test data prefix `ZZ`, always clean up (also songs created from requests, which are not `ZZ`-named). Headless tests: use one browser per page (background tabs don't render), set `NEXT_LOCALE=en` (site defaults to Bengali), and create test programmes before the first request or bust the cached list with "Start now" and load twice (revalidation serves stale once). If the prod build cached the list before your test data existed, stop the server, delete `.next/cache/fetch-cache` and restart.

## Public site (`src/app/(site)`)

Home, about, timeline, programmes (+ `[slug]` with registration), results, archive, community, donate, feedback, music. Footer "Made with ❤️ by Anirban" links to the portfolio (anirban-roy.vercel.app).

- **Registration**: individual, team (2-4 members + leader, team name) and pair (brother/sister). Chosen by `programmes.team_format`. Self-edit/withdraw by cookie or phone. Parsing in `src/lib/registration-input.ts`, schemas in `validators.ts`.
- **Music** (`/music`): YouTube library + song requests + **Pandal stream** (visitors request/upvote songs with a YouTube-style heart: red once voted, remembered on reload, toasts for already voted / closed, 3 requests per network, played history with re-request, ask organisers to reset the quota).
- **Collapsible sections** (`collapsible-section.tsx`): Rules, Teams, Lineup, Rounds and Request a song fold; closed on phones, open on desktop. Live screen, leaderboard and Register never fold.
- **Brain Games** live quiz: teams, rounds, questions, random team + random question per round (RPC `ask_random_team_question`), leaderboard.
- **Musical chair** (`programmes/[slug]`): live Music playing / STOP! screen (Realtime broadcast), **live leaderboard** (still in / out with places, `musical-chair-leaderboard.tsx`; one category at a time via a dropdown that follows the live category until the visitor picks one), visitors **request YouTube songs and upvote** them (`musical_chair_requests`, 3 per network; reuses `StreamRequestForm`/`StreamUpvoteButton` via props). Drawing votes: one per device.
- **Musical chair categories**: Kids (age ≤ 17), Men, Women. Registration needs age, and gender when 18+ (`registration_contacts.gender`); category from `src/lib/musical-chair-categories.ts`. Rounds carry `category` (numbered per category).

## Admin (`src/app/admin/(protected)`)

Dashboard, programmes (form, registrations, brain-games console, musical-chair console), **Registrations** (all programmes, filter/search, edit/delete any, team-aware), songs, song requests, **Stream** console, feedback, settings, years (editions). Back button on every page below the dashboard (`AdminTitle`).

- **Admin add registration**: "Add registration" button on a programme's Registrations page (`adminCreateRegistration`, same form; ignores closed/full/device lock, no edit cookie).
- **Musical chair console** (`musical-chair-console.tsx`): song pool = `songs` rows with `pool = musical_chair`, YouTube or MP3 (`round-player.ts` plays both; broken videos are skipped). Category picker on top (rounds, "Who's out", winner and Reset are per category); adults with no gender get Male/Female buttons, players with no age link to Registrations. Finish publishes that category's results (remark = category); programme completes when every category with players has a winner. Add from the library in bulk (`StreamLibrary` with `addSongs`/`target` props), add or reject visitor requests, "Who's out" and winner are dropdowns of registered players still in, Reset uses an AlertDialog.
- **Stream console**: approve/reject requests, play next, skip, volume, wake-lock, quota-reset requests, **add library songs in bulk** (`stream-library.tsx`, RPC `add_stream_songs`), **remove song from playlist** (RPC `remove_stream_song`).

## Tooling

- Skills (manual only: type /name): `spec-driven` (big changes: spec -> plan -> implement), `test-implementation` (independent bun tests), `wrap-up` (summarize session + refresh this file).
- Specs in `.claude/specs/NNNN-*.md`. Stop hook (`.claude/hooks/format-and-lint.sh`) runs prettier on the whole repo and lint after code changes; lint failures go back to Claude. Hooks can't run /compact.
- No automated test suite yet.

## Suggested improvements (for the user to decide)

Claude maintains this list: add items when you notice them, remove them when done or declined.

- Replace remaining native `confirm()` pop-ups (drawings, feedback, song requests, songs, new year) with AlertDialog.
- Antakshari and Brother-Sister have no team limit; set `max_participants` when decided.
- Add a global CSV export on the admin Registrations page.
- Add a bun test suite for validators and the stream/registration RPCs (use `test-implementation`).
- `rate_limits` rows are never deleted (no pg_cron); add a cleanup job if the table grows. The per-IP registration lock in Redis expires after 60 days.
- Stream plays YouTube only; Cloudinary MP3s can't be streamed.
- Set Upstash Redis env vars (and optional `TRANSLATE_CONTACT_EMAIL`) in Vercel; enable Speed Insights and Analytics.
- Rehearse the pandal stream and a musical chair game (YouTube playback on the host phone/laptop and speaker) before the event. Phones (iOS) ignore YouTube volume, so fades may not be audible there.
- The old free-text `song_requests` flow (admin Song requests page) is no longer linked from the musical chair page; remove it if unused.
- Musical chair rounds saved before 0012 have no category and no longer show in the leaderboards.
- Results page shows one #1 per musical chair category; consider grouping results by remark.
- Delete leftover test registrations ("tt", "Test Team") from Brain Games.
- Portfolio summary (`~/Documents/personal/portfolio/resources/durga-puja-project-summary.md`) is out of date.
