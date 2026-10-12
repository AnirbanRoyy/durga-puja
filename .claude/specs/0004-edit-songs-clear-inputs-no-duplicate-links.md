# 0004: Edit songs, clear-text button, no duplicate song links

- **Status:** draft
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
