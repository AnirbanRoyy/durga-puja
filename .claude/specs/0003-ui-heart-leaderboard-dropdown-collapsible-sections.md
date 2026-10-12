# 0003: Heart upvotes, leaderboard category dropdown, collapsible programme sections

- **Status:** implemented
- **Date:** 2026-10-12
- **Branch:** refactor/ui-enhancements

## Context

Three UI clean-ups on the public site. The upvote is an arrow pill that looks like a plain button. The musical chair page shows one leaderboard per category (Kids, Men, Women) stacked on top of each other, which is long and noisy. Programme pages stack many sections (live screen, leaderboard, rounds, song requests, teams, rules, register) and the user wants to know whether collapsible sub-headings would help.

## Requirements

### 1. Heart upvote (like YouTube's like button)

- The upvote control is a heart icon with the count beside it. It replaces the arrow pill everywhere it is used (Pandal stream and musical chair requests).
- Before the visitor votes, the heart is an outline in the normal text colour.
- After a vote, the heart is filled red and the count has gone up by one straight away (no wait for the server).
- A visitor who already voted (same browser) sees the red heart on load. Tapping it again shows a toast "You already upvoted this song" and never removes the vote. The same toast shows when the server says the browser had voted before.
- A song that can no longer be voted on (already in the game) shows the same heart and count in grey. It still reacts to a tap, with a toast "This song is already in the game, voting is closed", and the count does not change. The same toast shows if the server answers that the request is closed.
- A failed vote shows an error toast and the count goes back to what it was.
- Toasts use the existing sonner setup, in Bengali or English by the visitor's language.
- The heart gets a short pop animation when it turns red; no animation with reduced motion.
- Works at 360px; the tap target stays at least 36px high.

### 2. Musical chair leaderboard dropdown

- There is one "Leaderboard" section. Its heading has a dropdown beside it listing the categories (Kids, Men, Women).
- The dropdown starts on the live category: the one the host is conducting now (the category of the latest round). Before any round is played, it starts on the first category that has players.
- Choosing another category switches the standings below without reloading the page. Only one category's standings are visible at a time.
- When the live category changes while the visitor is watching (the host moves on to another category), the leaderboard follows it, unless the visitor has picked a category by hand. A hand pick stays until they reload.
- Categories with no players are not listed. If only one category has players, there is no dropdown, just the heading.
- The dropdown marks the live category (a small "Live" tag), with no other decoration.
- The "Rounds so far" list stays as it is for now.

### 3. Collapsible sub-headings on programme pages (recommendation)

Think first, then do the small safe version:

- Recommended: yes for **secondary** sections, no for the main one. A section that is the reason to open the page stays open; supporting sections fold away so the page is short on a phone.
- Collapsible (native-feeling accordion headers with a chevron, one tap to open/close, remembered only for the visit): **Rules**, **Request a song** (form and requested list), **Rounds so far** and **Teams / Lineup**.
- Always open, not collapsible: the live Music/STOP screen, the **Leaderboard** (so the dropdown in 2 is the only control there), and **Register** (it is the call to action and sits in the side column on large screens).
- Default state: on a phone, Rules, Request a song, Rounds and Teams are closed; on a large screen they are open.
- Programmes that lack a section (for example no rules text) show no header for it.
- Headings keep their current wording; the accordion only adds the chevron and the tap-to-fold behaviour.

## Out of scope

- Changing how votes are counted or limited, or any database change (the toasts only reuse the existing vote results).
- Changing the admin console or the admin leaderboard.
- Changing the results page.
- Collapsible sections on the Music page or any other page.

## Assumptions

- "Live category" means the category of the most recently played round (same rule the page uses today to put a category first).
- The heart is red-500/sindoor red, not the theme primary.
- Collapsed-by-default on phones and open on desktop is acceptable. If the user wants everything open by default everywhere, that is a one-line change.
- Screen readers get proper expanded/collapsed state on the accordion headers.

## Acceptance criteria

1. On the Music page and the musical chair page the upvote shows an outline heart and a count. Tap it: the heart turns red, the count rises by one, a reload still shows it red.
2. A second tap on a red heart shows the "already upvoted" toast and the count does not change.
3. A request already in the game shows a grey heart and the count. Tapping it shows the "voting is closed" toast and the count does not change.
4. On a musical chair page with Kids, Men and Women players, only one leaderboard is visible. The dropdown beside "Leaderboard" lists the three categories with "Live" on the one being played.
5. Save a round for Women in the admin console: a visitor with the page open, who has not touched the dropdown, sees the leaderboard move to Women. A visitor who picked Kids by hand stays on Kids.
6. With players in only one category, no dropdown appears.
7. At 360px, a musical chair page has Rules, Request a song, Rounds and Teams folded; tapping a header opens it; the leaderboard, live screen and Register are never folded. No horizontal scroll.
8. At desktop width, those sections are open on load and can still be folded.
9. Bengali and English both read correctly (new labels in both message files).
10. `bun run typecheck`, `lint` and `build` pass.

## Plan

## Context

Spec `.claude/specs/0003-ui-heart-leaderboard-dropdown-collapsible-sections.md` (approved).

- The upvote is an arrow pill. It should become a YouTube-style heart: outline, then red with an instant +1, and toasts for "already upvoted" and "voting closed".
- The musical chair page stacks three category leaderboards. It should show one leaderboard, with a category dropdown that follows the live category.
- Secondary programme sections (Rules, Request a song, Rounds so far, Teams/Lineup) should fold, closed on phones and open on desktop.

No migration and no change to the vote RPCs.

## 1. Heart upvote: `src/components/music/stream-upvote-button.tsx`

**New props:**

- `voted?: boolean` (initial, from the server)
- `closed?: boolean` (the request is no longer pending)

**Look:**

- A rounded pill keeps the same 36px height. It shows a heart icon and the count.
- Icon: `FavouriteIcon` from `@hugeicons/core-free-icons`.
    - Outline by default.
    - When voted, it is filled red with `text-red-500 fill-red-500`. Red is not the theme primary (primary is sindoor).
    - If HugeiconsIcon's paths don't take `fill`, use a small inline SVG heart in the same file instead.
- Closed: the heart and count are muted grey (`text-muted-foreground`), with no red.
- Pop animation: a new `--animate-heart-pop` token plus `@keyframes heart-pop` (scale 1 → 1.35 → 1, 300ms) in `src/app/globals.css`, next to `heartbeat`.
    - It is applied only on the click that turns the heart red, by keying the icon on vote.
    - `motion-reduce:animate-none`.

**Behaviour:** the button always reacts to a tap. It is never `disabled`, so it can show a toast.

- `closed` → `toast(t("votingClosed"))`, with no server call.
- Already voted (initial or this visit) → `toast(t("alreadyVoted"))`, with no server call.
- Otherwise it sets voted state and calls the action. Results:
    - `ok`: stays red.
    - `already_voted`: stays red, with the alreadyVoted toast.
    - `closed`: un-red, with the votingClosed toast.
    - anything else: un-red, with the `voteFailed` error toast.
- Count without double counting after realtime refresh: remember `countAtVote` when the visitor taps. Show `voted && countAtVote !== null ? Math.max(count, countAtVote + 1) : count`. `useOptimistic` is no longer needed.
- `aria-pressed={voted}`, `aria-label` = existing `stream.upvote`.

**Initial voted state** (so the heart is red on reload): new helpers in `src/lib/queries.ts`.

- `votedStreamRequests(voterHash, ids)` → `Set<string>` from `stream_votes`.
- `votedMusicalChairRequests(voterHash, ids)` → `Set<string>` from `musical_chair_votes`.
- Both use the service-role `db()`, filtered by `voter_hash` and `request_id in ids`. They return an empty set when `peekVoterHash()` (`src/lib/visitor.ts`) is null.

**Callers:**

- `src/components/music/pandal-stream.tsx` (two places, around lines 125 and 151): pass `voted={voted.has(song.id)}`.
- `src/components/programmes/musical-chair-public.tsx`: replace the plain count span for `added` requests with `<StreamUpvoteButton closed …/>`. Pending requests pass `voted`.

**Messages** (`messages/en.json`, `messages/bn.json`, `stream` namespace):

- Reuse `alreadyVoted` ("You've already upvoted this song.").
- Add `votingClosed`: "This song is already in the game, voting is closed." Because the stream also uses this key, the wording in `stream` is generic, e.g. "Voting is closed for this song.". The musical chair passes its own via an optional `closedMessage` prop, from `musicalChair.votingClosed`.

## 2. Leaderboard dropdown

**New client component** `src/components/programmes/musical-chair-leaderboard.tsx`, rewritten from the async server component.

- Props: `boards: { category; label; standings }[]` (only categories with players), `live: Category`, `finished`.
- State: `picked: Category | null`. Shown board = `picked ?? live`, falling back to the first board.
- Heading row: `<h2>Leaderboard</h2>`, with a shadcn `Select` (size sm, `src/components/ui/select.tsx`) beside it when `boards.length > 1`.
    - Items are category labels. The live one gets a small "Live" `Badge` (`src/components/ui/badge.tsx`).
    - With one board there is no Select, and the heading reads "Leaderboard · Kids".
- The still-in / out cards are unchanged markup, using `useTranslations("musicalChair.leaderboard")`. The root `NextIntlClientProvider` in `src/app/layout.tsx` already passes messages.
- Following live: `LiveRefresh` on `musical_chair_rounds` already refreshes the page. New `live` props arrive while `picked` state survives, so an untouched visitor follows the host and a hand pick sticks until reload.

**In `musical-chair-public.tsx`:**

- `live` = the category of the latest round (the existing `lastPlayed` logic). Without one, it is the first `MC_CATEGORIES` entry that has players.
- Boards are built in `MC_CATEGORIES` order, keeping only those with players.
- Render one `<MusicalChairLeaderboard>` instead of the map.

**Messages** (`musicalChair.leaderboard`): `live` ("Live" / "লাইভ") and `chooseCategory` (Select aria-label), in both files.

## 3. Collapsible sections

**New client component** `src/components/layout/collapsible-section.tsx`, with no new dependency.

- Props: `title: ReactNode`, `aside?: ReactNode` (right-side note, e.g. lineup locked text), `children`, `id`.
- State `open: boolean | null`. `null` means follow the breakpoint, so there is no hydration flash:
    - Body class: `null` → `max-lg:hidden`; `true` → shown; `false` → `hidden`.
    - Chevron (`ArrowDown01Icon`) rotation is driven the same way (`lg:rotate-180` while null).
- Header is a `<button aria-expanded aria-controls>` wrapping the `<h2 className="text-2xl font-semibold">` look plus the chevron.
    - First tap from `null` sets the opposite of the current visual state. A `matchMedia("(min-width: 1024px)")` read on click decides it.
    - `aria-expanded` is set from the same media query after mount.
- State is per visit only (React state), so nothing is stored.

**Use it for:**

- `src/app/(site)/programmes/[slug]/page.tsx`: the Rules section. Wrap `TeamList` and `Lineup` too.
- `src/components/programmes/team-list.tsx` and `lineup.tsx`: drop their own `<section><h2>` header. Lineup's locked/provisional text goes to the `aside` prop. The page passes `title={t(...)}` to `CollapsibleSection`. The translations stay in those namespaces, so the page reads them via `getTranslations`.
- `musical-chair-public.tsx`:
    - "Rounds so far" and "Request a song" become `CollapsibleSection`s.
    - The request section's inner grid keeps `grid-cols-1 md:grid-cols-2`.
    - The "Requested songs" h3 stays inside it.

**Not wrapped:** the live screen, the Leaderboard, Register (aside), drawings and brain games.

## Critical files

- `src/components/music/stream-upvote-button.tsx`
- `src/components/music/pandal-stream.tsx`
- `src/components/programmes/musical-chair-public.tsx`
- `src/components/programmes/musical-chair-leaderboard.tsx`
- `src/components/layout/collapsible-section.tsx` (new)
- `src/components/programmes/team-list.tsx`
- `src/components/programmes/lineup.tsx`
- `src/app/(site)/programmes/[slug]/page.tsx`
- `src/lib/queries.ts`
- `src/app/globals.css`
- `messages/en.json`
- `messages/bn.json`

## Verification

- Run `bun run format`, `typecheck`, `lint` and `build`.
- **Prod build** on port 3140 with headless Edge, `NEXT_LOCALE=en`, one browser per page. Use a ZZ musical chair programme with ZZ players in kids, men and women, and ZZ requests, all cleaned up after (including any songs created from requests).
    1. Tap the heart on a pending request: it goes red and the count is +1. Reload: still red. Tap again: "already upvoted" toast, and the count is unchanged.
    2. Add the request to the pool in admin: the public heart goes grey. Tap it: "voting is closed" toast, and the count is unchanged.
    3. Repeat check 1 on `/music` for a pandal stream request.
    4. There is one leaderboard, and the Select lists three categories with "Live" on the latest round's category. Save a women round from admin: an untouched page switches to Women without reload, and a page where Kids was picked stays on Kids.
    5. With players in only one category, there is no Select.
    6. At 360px, Rules, Request a song, Rounds and Teams are folded, and a tap opens them. At 1280px they are open, and a tap folds them. Check for no horizontal scroll, and take screenshots.
    7. Spot-check the bn locale for the new labels.
- Afterwards, set the spec status to implemented and update `.claude/context.md`.

## As built

- `TeamList` and `Lineup` wrap themselves in `CollapsibleSection` (their own titles and translations), instead of the page passing the title in.
- `CollapsibleSection` lives in `src/components/layout/collapsible-section.tsx`; while untouched, CSS decides open/closed (`max-lg:hidden`), so there is no flash.
- Both lists that lacked a base `grid-cols-1` (`team-list.tsx`, `lineup.tsx`) got one.
- Verified on a prod build (360px and 1280px, en and bn) with ZZ data, then cleaned up.
