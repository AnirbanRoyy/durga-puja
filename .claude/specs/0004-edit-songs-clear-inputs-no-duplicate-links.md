# 0004: Edit songs, clear-text button, no duplicate song links

- **Status:** implemented
- **Date:** 2026-10-12
- **Branch:** ccr-853343e5-sxzw2c

## Context

Three admin and visitor quality fixes. Once a song is added on the admin Songs page, only "Active" and "Featured" can be changed; a wrong category, title, artist or link means deleting and re-adding it. Clearing a text field on a phone means holding backspace. And nothing stops the organisers from adding the same YouTube video to a library twice.

## Requirements

### 1. Edit a song (admin)

- Every song row on the admin Songs page (both the Music page library and the Musical chair library) has an Edit button (pencil icon) beside the existing star / Active / delete controls.
- Edit opens a form pre-filled with the song's current values. For a YouTube song: title, artist, category and YouTube link. For an uploaded MP3: title and artist (the file itself can't be swapped here; delete and re-upload for that).
- Category is a dropdown of the existing categories (Mahalaya, Agomoni, Dhunuchi, Bhajan, Modern, Bollywood, Other).
- Saving updates the song everywhere it shows (admin list, public Music page, musical chair pool) and shows a success toast. Cancel closes the form with no change.
- Bad input is refused with an error toast and the form keeps what was typed: empty title, a link that isn't a YouTube link, or a link that is already in the same library (see 3).
- Works at 360px wide.

### 2. Clear (X) button on text fields

- Every single-line text field on the site and in the admin area (names, phone, YouTube link, search boxes, titles, etc.) shows a small X icon at its right edge while it has text in it.
- Tapping the X empties the field in one go and keeps the cursor in the field, so the user can type straight away. The X then disappears.
- Clearing behaves like the user deleted the text: live search/filter boxes update their results, and forms submit the empty value.
- The X is not shown on an empty field, a disabled or read-only field, or on number, date/time, password, file and hidden inputs.
- The X has an accessible label ("Clear") and a tap target big enough for a thumb; it never overlaps the typed text.

### 3. No duplicate song links

The same YouTube video counts as the same link whatever form it was pasted in (`youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, with or without `&t=`, `?si=` and other extras).

- **Admin, Songs page:** adding a YouTube song whose video is already in that library (Music page or Musical chair) is refused with an error toast naming the existing song (e.g. "Already in this library as “Dhak Baje”"). Nothing is added. The same video may still be in both libraries (the musical chair pool copies music page songs on purpose).
- **Admin, editing:** changing a song's link to a video that another song in the same library already has is refused the same way.
- **Admin, other add paths:** adding library songs to the musical chair pool, approving a visitor's musical chair request, and adding library songs to the pandal stream never create a second copy of a video that is already there (already true today; must stay true).
- **Visitors:** requesting a song for the pandal stream or for musical chair with a link that is already on that list never creates a second entry. It counts as an upvote (or tells them they already voted / it is already in the game), as it does today.

## Out of scope

- Replacing the audio file of an MP3 song.
- Moving a song between the Music page and Musical chair libraries.
- Clear buttons on multi-line text areas (comments, rules, feedback).
- Merging or cleaning up duplicates that are already in the database; the admin can delete them by hand.
- Duplicate checks for MP3 uploads (each upload is a new file).
- The old free-text song request form (no longer linked anywhere).

## Assumptions

- "Link" means the YouTube video, not the exact URL text; two different URLs to the same video are duplicates.
- Duplicates are checked per library, not across libraries, since the musical chair pool deliberately reuses music page songs.
- Editing happens inline in the song row (or a small dialog), not on a separate page.
- The X button goes into the shared text input, so every text field gets it without per-form work; fields that are clearly not free text (number, date, password, file) are skipped.

## Acceptance criteria

1. Admin > Songs: add a YouTube song "ZZ Test" as Agomoni. Click its Edit button, change category to Modern, title to "ZZ Test 2", artist and link to another video, save: toast, and the row shows the new values; the Music page shows the new title, category and video.
2. Edit an MP3 song in the Musical chair library: only title and artist are editable; saving updates the row.
3. Edit a song and clear the title, save: error toast, nothing changes. Cancel closes the form unchanged.
4. Add a YouTube song using `https://youtu.be/<id>`; add it again to the same library as `https://www.youtube.com/watch?v=<id>&t=30s`: error toast naming the first song, the list still has one copy.
5. Add the same video to the Musical chair library: it is accepted (different library).
6. Edit a second song's link to that same video in the same library: error toast, link unchanged.
7. On `/music`, request a stream song, then request the same video with a different URL form from another browser: no second row, the first one's upvote count goes up.
8. Any text field (admin Registrations search, registration name, stream request link): type text, an X appears; tap it: the field is empty, focused, the X is gone, and the search list resets. No X on an empty field or on the age (number) field.
9. At 360px the edit form and X buttons fit with no sideways scroll.
10. All `ZZ` test songs and requests deleted afterwards.

## Plan

Spec: `.claude/specs/0004-edit-songs-clear-inputs-no-duplicate-links.md` (approved).

### Context

On admin Songs, a song can only be made active, inactive or featured after it is added. A wrong title, artist, category or link means deleting and re-adding it. Text fields have no one-tap clear, which hurts on phones. Admin can add the same YouTube video to a library twice. Visitor requests (pandal stream and musical chair) are already deduped by video ID at DB level (`unique (year, youtube_id)`, `unique (programme_id, youtube_id)` plus the `in_pool` check), and so are the admin paths `addSongsToMusicalChairPool`, `addMusicalChairRequestToPool` and `add_stream_songs`. The gaps are **`addYouTubeSong`** and the new edit action.

**No migration.** All checks are app-level in server actions. A unique index on `songs (pool, youtube_id)` would fail if prod already has duplicates, and Supabase MCP isn't connected in this session. A race between two simultaneous admin adds is accepted, since there is one organiser team.

### 1. Edit a song

**`src/actions/admin/content.ts`**

- Add a helper `findPoolDuplicate(pool, youtubeId, exceptId?)`. It runs `db().from("songs").select("id, title").eq("pool", pool).eq("youtube_id", youtubeId)`, adds `.neq("id", exceptId)` when given, uses `.limit(1).maybeSingle()`, and returns the title or null.
- Add `editSong(_prev: ActionState, formData: FormData): Promise<ActionState>`:
    - Calls `requireAdmin()` and reads `id`.
    - Loads the song (`source, pool`). If it's missing, returns "Song not found."
    - Validates title, artist and category with the same rules as `youtubeSongSchema`, via a `songDetailsSchema` that `youtubeSongSchema` extends with `url`.
    - For `source === "youtube"`: `parseYouTubeId(url)`. On failure it returns "That doesn't look like a YouTube link.". Then `findPoolDuplicate(pool, id, songId)`, which returns `Already in this library as “<title>”`.
    - Updates `title, artist, category` and, for YouTube songs, `youtube_id`. MP3 rows ignore the link and category.
    - Calls `refresh()` and returns `{ ok: true, code: "Song updated." }`. On failure it returns `values: raw` so the form refills.
- The existing `updateSong` (star and Active switch) stays as is.

**`src/components/admin/songs-manager.tsx`**

- In `SongList`, add a pencil Button (`PencilEdit02Icon`, `title="Edit song"`) before the star. Its state is `editingId`, and only one row edits at a time.
- When editing, the `<li>` renders a new `EditSongForm` under the row's top line. It uses `useActionState(editSong)` and `useActionToast` (the same pattern as `AddYouTubeSongForm`).
    - It has a hidden `id` field and inputs for Title and Artist.
    - YouTube songs also get a Link input (default `https://youtu.be/<youtube_id>`) and a `NativeSelect` over the existing `CATEGORIES`.
    - MP3 songs show a short note: "To change the file, delete and re-upload."
    - Buttons: Save and Cancel. Cancel clears `editingId`. On `state.ok`, an effect closes the form.
    - Layout is `grid grid-cols-1 sm:grid-cols-2` with base `grid-cols-1` per the 360px rule. `li` becomes `flex-wrap` / `flex-col` when editing so it fits phones.
- To show the category of YouTube songs in the row, reuse the existing `songDetail()`, which already does this.

### 2. Clear (X) button: `src/components/ui/input.tsx`

The shared `Input` gets the X, so every `Input` and `TextField` (public forms go through `form-bits.tsx`) picks it up.

- **Which inputs are clearable:** those where `type` is undefined, `text`, `search`, `url`, `email` or `tel`, and that are not `disabled` or `readOnly`. Any other input renders exactly as today, as a bare `<input>`.
- **Markup for clearable inputs:** a `<div data-slot="input-wrapper" className={cn("relative w-full min-w-0", className)}>`. The caller's `className` moves to the wrapper, because text inputs today only pass layout classes like `hidden sm:block` (results editor). The wrapper contains:
    - the input with `pr-8` added, so text never runs under the X;
    - when it has text, a `<button type="button" aria-label={t("clear")}>` positioned `absolute inset-y-0 right-0`, `size-8` (full input height), with `Cancel01Icon` in muted colour.
- **Has-text state:** for a controlled input this is `String(props.value ?? "") !== ""`. For an uncontrolled one it's local state, seeded from `defaultValue` and updated in the wrapped `onChange`. A `reset` listener on `input.form` re-reads `input.value` in a `setTimeout`, because React 19 resets action forms.
- **Clear action:**
    - `onPointerDown` calls `preventDefault()` so the input keeps focus.
    - `onClick` sets the value through the native setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set`) and dispatches a bubbling `input` event. React's `onChange` then fires with `""`, so controlled parents (search boxes) update their state and uncontrolled forms submit empty.
    - Then `focus()`.
- **Refs:** merge the forwarded `ref` (React 19 ref-as-prop) with an internal ref.
- **Label text:** `forms.clear` in `messages/en.json` ("Clear") and `messages/bn.json` ("মুছুন"). The admin's nested provider already passes `forms`, and the root layout passes everything. The login page sits under the root provider.
- Textareas are untouched.

### 3. No duplicate links

- **`addYouTubeSong`:** after `parseYouTubeId`, call `findPoolDuplicate(pool, youtubeId)`. If it finds one, return `{ ok: false, code: "Already in this library as “…”", values: raw }`. `useActionToast` shows it and the form keeps its input.
- **`editSong`:** uses the same check, excluding itself (above).
- **Visitors and other admin add paths:** no code change. They already dedupe by parsed video ID (verify in testing). `parseYouTubeId` (`src/lib/validators.ts`) already normalises `youtu.be`, `watch?v=`, `shorts`, `embed`, `live`, `&t=` and `?si=`.

### 4. Docs

- Spec: append this plan under `## Plan` and set the status to `planned`, then `implemented` at the end.
- `.claude/context.md`:
    - Admin: "Songs: edit title/artist/category/link (one copy of a video per library)".
    - UI: "Text inputs have an X clear button (`ui/input.tsx`)".
    - Bump the "Specs done" list to 0004.
    - Add a suggestion: "Unique index on `songs(pool, youtube_id)` after cleaning existing duplicates."

### Critical files

- `src/actions/admin/content.ts`: `editSong`, `findPoolDuplicate`, and the check in `addYouTubeSong`
- `src/components/admin/songs-manager.tsx`: pencil button and `EditSongForm`
- `src/components/ui/input.tsx`: the clear button
- `messages/en.json`, `messages/bn.json`: `forms.clear`

### Verification

This container has no `.env` and no Supabase access, so DB-backed pages can't run here.

1. `bun install`, `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run build` (with dummy env vars if `env.ts` requires them, only to compile).
2. **Clear button in a real browser:** a scratch harness in the scratchpad (not committed). It bundles `Input` with `bun build` and renders it in headless Chromium via Playwright at 360px. Cases to check:
    - **Controlled search input:** type, the X appears; click it, the state becomes "", the input is focused and the X is gone.
    - **Uncontrolled input in a form:** clear it, `FormData` gives "".
    - **No X:** on an empty field, `type="number"`, or a disabled field.
    - **`className="hidden sm:block"`:** still hides it at 360px.
3. **The user runs the spec's acceptance criteria 1–10** on a prod build (port 3140) with real env: edit YouTube and MP3 songs, refused duplicate across URL forms, allowed across libraries, visitor re-request upvotes, X on search, and cleanup of `ZZ` data.
