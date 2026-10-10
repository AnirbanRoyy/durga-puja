# 0001: Add library songs to the pandal stream, and remove songs from the queue

- **Status:** implemented
- **Date:** 2026-10-10
- **Branch:** feature/enable-add-songs-to-pandal-stream-functionality
- **Migration:** `supabase/migrations/0010_stream_admin_songs.sql`

## Context
Today the pandal stream (`/admin/stream`) only plays songs that visitors request and the admin approves. The admin also keeps a song library on the Music page (`songs` table, `pool = 'music_page'`). This branch adds two things:
1. On the Pandal stream admin page, list the library songs. The admin can tick one, several or all of them and add them to the playlist in one go.
2. While streaming, the admin can remove any song from the playlist, including "Up next".

## Approach

### 1. Database: migration `0010_stream_admin_songs.sql` (additive only; it adds new functions and changes nothing existing)

**`add_stream_songs(p_year int, p_songs jsonb) returns integer`**
- Input is `[{youtube_id, title, channel}]`. It returns how many songs actually joined the playlist.
- It serialises with `pg_advisory_xact_lock` on the stream year.
- Each song is handled by its current state:
  - **New:** inserted as `approved`, with `requested_by = 'Organisers'`, `upvotes = 0`, the thumbnail `https://i.ytimg.com/vi/<id>/mqdefault.jpg`, and `approved_at = now()`.
  - **Pending, rejected or played:** set to `approved`. A pending visitor request for the same song counts as approved.
  - **Already approved:** skipped.
- No `stream_request_log` row is written, so this never uses up a visitor's 3-request quota.
- **When streaming:** if nothing is playing, it starts one of the new songs and draws "Up next". If only "Up next" is empty, it draws one. This is the same logic as `approve_stream_request` (in `0006_pandal_stream.sql`).

**`remove_stream_song(p_request_id uuid) returns text`**
- Refuses with `now_playing` for the song currently playing; the existing **Skip** button covers that.
- **If the song had played before** (`play_count > 0`): it goes back to `played`, so it stays in "Played earlier" and visitors can re-request it.
- **Otherwise:** the row is deleted. Its votes cascade, and the log's `request_id` becomes null, which already shows as "(removed song)" in the quota card.
- **If it was "Up next":** it is set to null first, then redrawn with `pick_stream_song`.

**Grants:** `revoke` from public, anon and authenticated; `grant` to service_role.

The migration is applied to the shared DB via the Supabase MCP. `src/lib/database.types.ts` gets both RPC signatures.

### 2. Server actions: `src/actions/admin/stream.ts`

**`addLibrarySongsToStream(songIds: string[])`**
- Uses the existing `run` helper.
- Loads the chosen `songs` rows with `source = 'youtube'` and active, maps them to `{youtube_id, title, channel: artist}`, then calls the RPC.
- Returns `{ ok: true, added }`, so `StreamActionResult` gains an optional `added`.

**`removeStreamSong(id)`**
- Maps `now_playing` to "This song is playing now; use Skip."

### 3. Data: `src/app/admin/(protected)/stream/page.tsx`
- Also loads `listSongs("music_page")` from `src/lib/queries.ts:273`.
- Only YouTube songs are passed in. The stream player is YouTube-only, so Cloudinary audio can't play.

### 4. UI: `src/components/admin/stream-console.tsx`

**New card "Add from the song library"** in the right-hand column, above the requests:
- A search box (title or artist), then a checkbox list with the thumbnail, title and artist.
- **"Select all"** toggles the songs currently shown; a count shows "N selected".
- **Disabled rows:** songs already in the playlist, now playing or up next. They are unticked and show a small "In playlist" or "Playing" badge, matched by `youtube_id`.
- **"Add N to playlist" button** runs the add action. It toasts "Added N songs", or "Those songs are already in the playlist" when N is 0, then clears the selection.
- **Empty state:** "No YouTube songs in the library yet" with a link to `/admin/songs`.
- The list scrolls inside the card (`max-h-96 overflow-y-auto`) and uses the `minmax(0,1fr)` grid trick so it fits at 320px.

**Playlist card**
- Each row, including the "Up next" row, gets a **Remove** icon button that opens an AlertDialog: "Remove 'X' from the playlist?" with "Keep it" and "Remove".
- It then toasts "Removed from playlist".
- The AlertDialog pattern is reused from `src/components/admin/registration-actions.tsx`.

**Labels:** library songs show "Organisers" as the requester, through the existing `Row`.

## Not changing
- Visitor quotas, the request flow and the public page. Public visitors see admin-added songs in the queue and "Up next", like any other song.

## Verification
- `bun run format`, `typecheck`, `lint` and `build`.
- **Headless Edge script against `bunx next start -p 3140`,** using test data "ZZ…", 2–3 temporary YouTube library songs, cleaned up afterwards:
  1. The library card lists the YouTube songs; selecting 2 and adding them shows toast "Added 2 songs", and they appear in the Playlist as "Organisers".
  2. Adding them again shows "already in the playlist", with 0 added. Select all then adds only the rest.
  3. Start streaming with an empty queue, then add songs: one starts playing and "Up next" is filled.
  4. Removing the "Up next" song redraws "Up next"; removing a queue song makes it disappear. Removing a song that was played before puts it back in "Played earlier".
  5. A visitor's pending request for a library song becomes approved when added from the library, and the visitor's quota count is unchanged.
- A 390px and 320px screenshot of the library card to check it doesn't overflow.
