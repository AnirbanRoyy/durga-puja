# 0002: Musical chair plays YouTube songs

- **Status:** implemented
- **Date:** 2026-10-11
- **Branch:** main
- **Migration:** 0011_musical_chair_requests.sql

## Context

Today the musical chair only plays MP3s that the admin uploads to Cloudinary (Songs page, "musical chair" pool) and then starts a round from the host console. That upload step is slow and needs the audio files in hand. The Pandal stream already works from YouTube links, and the admin already keeps a YouTube library on the Songs page. The musical chair should use YouTube links the same way, so the admin can pick songs from a list and start playing without uploading anything.

## Requirements

- The musical chair console (`/admin/programmes/<id>/musical-chair`) plays songs from YouTube links. No upload is needed before a game.
- The song pool for the game is chosen from the YouTube songs already in the admin's song library (the same songs the Pandal stream offers). The admin can add a song to the musical chair pool with a link, from the Songs page, without uploading a file.
- The admin can tick one, several or all library songs for the pool and untick them again. The console shows which songs are in the pool.
- A round works as it does now: pressing Start (or Space) picks a random song from the pool, starts it at a random point (not in the first 20 seconds, with room for the longest round), plays it for a random time between the shortest and longest settings, then stops it. Every song plays once before any repeats.
- Music fades in at the start and out at the stop, as it does now.
- "Stop now", the optional host countdown, round numbers and "Reset" keep working unchanged.
- The public live screen keeps showing Ready, Music playing and STOP! in step with the console, and still shows the song title while it plays.
- Visitors can request songs for the musical chair and upvote requested songs, the same way they do for the Pandal stream (search YouTube or paste a link, upvote once per device). Requested songs appear on the musical chair page with their votes, most voted first, and update live.
- The admin sees the requested songs in the console, with votes, and can add a requested song to the game's song pool (or reject it) in one click.
- After every stop, "Who's out this round?" is a dropdown of the registered players who are still in the game (players already out are not listed). Choosing a player and saving marks them out for that round.
- The leaderboard on the public musical chair page updates live, without a refresh, as soon as the admin saves who is out. It shows the players still in the game and those already out, with the order they went out in (latest out ranks highest among the eliminated).
- "Finish the game" asks for the winner (also chosen from the registered players) and publishes the final results as it does now: winner first, then players in reverse order of elimination.
- Rounds are still saved (song, start point, play time) so the leaderboard and history keep working.
- Songs that were uploaded as MP3 earlier keep working in the pool, so a game already set up does not break.
- If a YouTube video cannot play (removed, blocked, not embeddable), the console shows a clear message and picks another song instead of leaving a silent round.
- The console tells the admin when the pool is empty and links to where songs are added.

## Out of scope

- Visitors do not need to be able to play or hear the songs themselves.
- No change to the Pandal stream or the Music page.
- No change to registration. The live Ready / Music playing / STOP! screen keeps its layout; the leaderboard is added below it.
- Removing the MP3 upload feature or deleting existing Cloudinary files.
- Playing audio on the visitors' phones; sound still comes from the host's device and speakers.

## Assumptions

- "Same as the Pandal stream" means: songs come from the YouTube library and play through the YouTube player on the host's device. The library is shared, so a song added once can be used by both the stream and the musical chair.
- The pool is a per-song choice for the musical chair (separate from the stream playlist), so the admin can use different songs for each.
- MP3 upload stays available as an extra option and is not removed.
- The host presses Start once to allow browser audio (autoplay rules), as with the stream.
- Song length is read from the YouTube player; if it is unknown the start point falls back to the 20 second default.
- Musical chair song requests are kept apart from the Pandal stream requests, so a request for one does not appear in the other. They reuse the same request limits as the stream (3 requests per network, one upvote per device per song).
- The existing free-text song request form on the musical chair page is replaced by the YouTube request flow.
- Registered players are the registrations of this musical chair programme. If someone not registered must be marked out, the admin can still type a name as a fallback.
- Database changes, if needed, are additive only because the database is shared with production.

## Acceptance criteria

- On the Songs page, add a YouTube link, then open the musical chair console: the song can be added to the pool without any upload.
- In the console, select 3 library songs and start a round: one of them plays from a point after the first 20 seconds, fades in, and stops by itself within the set range with a fade out; the public screen shows Music playing, then STOP!.
- Run more rounds than there are songs: each song plays once before any repeats, and no song plays twice in a row.
- Press "Stop now" mid-round: music fades out and the public screen shows STOP! at once.
- Stop a round: the "Who's out" dropdown lists only registered players still in the game. Choose one and save: the public leaderboard updates within a couple of seconds with no refresh, moving that player to the "out" list.
- A player marked out in an earlier round no longer appears in the dropdown.
- On the public page, request a YouTube song and upvote another: both show up live, most voted first. In the admin console, add one to the pool: it can then be drawn in a round.
- Finish the game choosing the winner from the dropdown: results show the winner first, then the eliminated players in reverse order. Reset rounds works as before.
- Add a song whose YouTube video is unavailable: the console shows a message and the next song plays.
- With an empty pool, Start is disabled and the console explains what to do.
- An existing MP3 song in the pool still plays.
- Console and pool list fit a 360px wide phone screen without sideways scrolling.

## Plan

### Context

Spec `.claude/specs/0002-musical-chair-youtube-songs.md` (approved). Today the musical chair console plays only Cloudinary MP3s from `songs` rows with `pool = 'musical_chair'`, `source = 'cloudinary'`. The spec makes it play YouTube songs like the Pandal stream, lets visitors request and upvote musical chair songs, and replaces the free-text "Who's out" box with a dropdown of the registered players, plus a live public leaderboard.

### Approach

### 1. Song pool: reuse the `songs` table (no schema change)

- Pool membership stays as `songs` rows with `pool = 'musical_chair'`.
- A YouTube pool song is a row with `source = 'youtube'` and `youtube_id`. The existing check constraint already allows this.
- MP3 rows stay untouched, so both kinds play.
- Adding a library song to the pool inserts a copy: title, artist and youtube_id from the `music_page` row. It is skipped when the pool already has that `youtube_id`.
- Removing a song deletes the pool row. `musical_chair_rounds.song_id` is `on delete set null`, so history keeps `song_title`.

**New server actions in `src/actions/admin/content.ts`:**

- `addSongsToMusicalChairPool(songIds[])`
- `removeFromMusicalChairPool(songId)`
- `addYouTubeSong` gets a `pool` form field (hidden input, default `music_page`), so the Songs page can add a link straight into the musical chair pool.

### 2. Visitor requests and votes: migration `0011_musical_chair_requests.sql` (additive)

**Tables:**

- `musical_chair_requests`: id, programme_id (FK, on delete cascade), youtube_id, title, channel, thumbnail_url, requested_by, status ('pending' | 'added' | 'rejected'), upvotes (default 1), song_id (FK songs, on delete set null), created_at, and `unique (programme_id, youtube_id)`.
    - Public read where `status <> 'rejected'`.
    - Added to the `supabase_realtime` publication.
- `musical_chair_votes` (request_id, voter_hash) primary key: private.
- `musical_chair_request_log` (programme_id, ip_hash, request_id, created_at): private. It holds the 3-per-network limit.

**RPCs** (service_role only, `set search_path = ''`, advisory lock per programme and ip). These copy the stream versions in `0006` and `0007`, minus re-request and played.

- `request_musical_chair_song(p_programme_id, p_youtube_id, p_title, p_channel, p_thumbnail_url, p_requested_by, p_voter_hash, p_ip_hash, p_limit)` returns one of 'added', 'upvoted', 'already_requested', 'rejected', 'in_pool' or 'limit_reached'.
    - It returns 'in_pool' when the song is already in the pool or the request was added.
- `upvote_musical_chair_request(p_request_id, p_voter_hash)` returns one of 'ok', 'already_voted', 'closed' or 'not_found'.
- `musical_chair_requests_used(p_programme_id, p_ip_hash)` returns an integer.

**Other changes:**

- Mirror the migration file and apply it via the Supabase MCP.
- Add the types to `src/lib/database.types.ts`.
- Add `"musical_chair_requests"` to `LiveTable` in `src/components/realtime/live-refresh.tsx`.

**Public actions in `src/actions/public.ts`:**

- `requestMusicalChairSong(prev, formData)`: the same shape as `requestStreamSong`. It reads a hidden `programmeId`, checks that the programme is a musical chair, and uses `fetchYouTubeInfo`, `getVoterHash`, `getIpHash`, the same rate limits and `STREAM_REQUEST_LIMIT`.
- `upvoteMusicalChairSong(id)`.

**Admin actions:**

- `addRequestToMusicalChairPool(requestId)`: inserts a `songs` row (pool `musical_chair`, youtube) unless one exists, then sets the request to `added` with its `song_id`.
- `rejectMusicalChairRequest(requestId)`.

**Queries in `src/lib/queries.ts`:**

- `listMusicalChairRequests(programmeId)`: no rejected rows, ordered by upvotes desc then created_at.
- `musicalChairRequestsLeft(programmeId)`.

### 3. Public musical chair page (`src/components/programmes/musical-chair-public.tsx`)

- Replace `SongRequestForm` and the `song_requests` list with:
    - **Request form:** reuse `StreamRequestForm` by adding optional props: `action` (defaults to `requestStreamSong`), `hidden` fields (`programmeId`), and a translation namespace. The localStorage name memory and the requests-left line stay.
    - **Requested songs list:** thumbnail, title, "by name", a status badge (Pending / In the game), and an upvote pill. Reuse `StreamUpvoteButton` with an optional `vote` prop (server action, defaulting to `upvoteStreamSong`).
- Add `<LiveRefresh tables={["musical_chair_requests"]} filter={programme_id=eq.…} />`.
- **New leaderboard section** (server-rendered, so it updates live through the existing `musical_chair_rounds` LiveRefresh):
    - Players are `listRegistrations(programmeId)` names.
    - "Still in" means players not yet eliminated.
    - "Out" lists eliminated rounds, latest first, ranked `N - k + 1` (N players, k-th out), with "Out in round R".
    - Names typed in that aren't registered still show in "Out".
    - When the programme has published `results`, the leaderboard says the game is over and links to the results page.
- Add new message keys to `messages/en.json` and `messages/bn.json` under `musicalChair`: leaderboard, stillIn, outIn, position, requests text, and status "in the game". Bengali text follows existing tone.
- The old `requestSong` action and the admin `/admin/song-requests` page stay, for old requests.

### 4. Admin console (`src/components/admin/musical-chair-console.tsx` + `.../musical-chair/page.tsx`)

**Page loads:** pool songs (both sources), YouTube library songs (`listSongs("music_page")`), pending requests, rounds and registrations.

**Playback** goes through a new `src/components/admin/round-player.ts` (client helper) with one interface for both sources:
`load(song) → duration | null`, `play(offset)`, `fadeTo(vol, ms)`, `stop()`, `onEnded` and `onError`.

- **MP3:** the current `HTMLAudioElement` logic moves here unchanged.
- **YouTube:**
    - One hidden IFrame player is mounted once in the console, using `loadYouTubeApi` from `src/lib/youtube-api.ts`.
    - The `YTPlayer` type is extended with `seekTo`, `getDuration`, `cueVideoById`, `mute` and `unMute`.
    - Load runs `loadVideoById(id)` at volume 0, waits for PLAYING, reads `getDuration()`, then `seekTo(offset)` and fades in with `setVolume` steps (0–100).
    - Pause and stop at the end of a round. `cueVideoById` preloads the next song while the round is stopped.
    - `onError` (codes 2, 5, 100, 101 and 150) produces a toast "Couldn't play X, trying another song". The console draws the next song, at most one try per song in the pool.
- **Start time:** the public "Music playing" broadcast is sent only once audio is actually playing, so a slow YouTube load never shows "playing" while silent.
- **Kept as is:** the shuffle bag, no repeat across refills, `pickStartOffset`, `randomBetween`, fades, the timer, Space key and broadcast.

**Pool card** (replaces "Song pool"):

- It lists pool songs with a YouTube or MP3 badge and a Remove button.
- Below it is an "Add from the song library" picker, modelled on `src/components/admin/stream-library.tsx`: search, Select all, checkboxes, "In pool" badge for disabled rows, and an "Add N to pool" button.
- If it's practical, `stream-library.tsx` is generalised with props (action, label, `listedIds`) instead of copied.

**Requests card:** pending visitor requests with upvotes and requester, plus Add to pool and Reject buttons. It refreshes live through `LiveRefresh` on `musical_chair_requests`.

**Who's out:**

- A shadcn `Select` lists registered players still in. Players eliminated in other rounds are excluded; the current round's own pick stays listed.
- A last option, "Someone else…", shows a text input as the fallback.
- Save calls the existing `setRoundEliminated`.
- The round list in the console updates from props after `refresh()`, which `setRoundEliminated` already calls.

**Finish the game:** the winner comes from the same Select, defaulting to the only player left when exactly one remains. It still calls `finishMusicalChair`.

**Other console changes:**

- Empty-pool message: "Add songs to the pool below or on the Songs page". Start stays disabled.
- Replace the `confirm()` on Reset with an AlertDialog. The console is already being touched, and `confirm()` is on the suggestions list.

### 5. Songs page (`src/app/admin/(protected)/songs/page.tsx`)

- The musical chair column becomes "Musical chair". It holds `AddYouTubeSongForm` with `pool="musical_chair"` (link + title), and the MP3 uploader stays under it as "or upload an MP3".

### Critical files

- `supabase/migrations/0011_musical_chair_requests.sql` (new)
- `src/lib/database.types.ts`
- `src/actions/admin/content.ts`
- `src/actions/public.ts`
- `src/lib/queries.ts`
- `src/lib/youtube-api.ts`
- `src/components/admin/round-player.ts` (new)
- `src/components/admin/musical-chair-console.tsx`
- `src/app/admin/(protected)/programmes/[id]/musical-chair/page.tsx`
- `src/components/admin/stream-library.tsx` (generalised)
- `src/components/programmes/musical-chair-public.tsx`
- `src/components/programmes/musical-chair-leaderboard.tsx` (new)
- `src/components/music/stream-request-form.tsx`
- `src/components/music/stream-upvote-button.tsx`
- `src/components/realtime/live-refresh.tsx`
- `src/app/admin/(protected)/songs/page.tsx`
- `src/components/admin/songs-manager.tsx`
- `messages/en.json`
- `messages/bn.json`

### Not changing

- Pandal stream behaviour and the Music page. The shared request form and upvote button keep their defaults.
- Registration and the results page.
- Existing MP3 songs and Cloudinary files.

### Verification

- Run `bun run format`, `typecheck`, `lint` and `build`.
- **RPC script** (bun + service role, `ZZ` data, cleaned up):
    - request, upvote and duplicate upvote;
    - limit reached after 3 from the same ip_hash;
    - a rejected request returns 'rejected';
    - a song already in the pool returns 'in_pool';
    - anon cannot read votes or the log, and cannot execute the RPCs.
- **Headless Edge against `bunx next start -p 3140`,** with a ZZ musical chair programme, ZZ registrations and 3 temporary YouTube library songs:
    1. Add 3 library songs to the pool from the console. They show with a YouTube badge, and adding them again is skipped.
    2. Start a round. A YouTube iframe loads and plays, the public page shows Music playing then STOP!, and a round row is saved with an offset of 20s or more.
    3. Stop now flips the public screen to STOP!.
    4. The "Who's out" select lists only remaining players. Save one, and the public leaderboard moves them to Out without a reload (watch the DOM for a few seconds). The next round's dropdown no longer lists them.
    5. An unavailable video id in the pool gives a toast, and another song plays.
    6. On the public page, request a YouTube link, upvote it from a second browser context and see the count update live. Admin "Add to pool" shows it in the pool card.
    7. Finish the game with the winner select, and results show the winner first and then reverse elimination.
    8. An existing MP3 pool song still plays.
    9. Take 360px screenshots of the console, Songs page and public page, and check for no horizontal overflow.
- Restore everything and delete the ZZ rows.

## As built

Matches the plan, with these differences:

- "Who's out" and winner use a native `<select>` (same styling as `NativeSelect`) with a "Someone else…" option, not the shadcn Select.
- Removing a YouTube song from the pool reuses `deleteSong`; there is no separate `removeFromMusicalChairPool`. MP3 songs are removed on the Songs page only.
- Tested end to end (headless Edge, ZZ data, cleaned up): 20 RPC checks and 36 UI checks passed, including live leaderboard updates, skipped broken video, 360px layouts.
