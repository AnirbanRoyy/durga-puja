# 0005: Admin access control (users, roles, permission sets)

- **Status:** implemented
- **Migration:** 0013_access_control.sql
- **Date:** 2026-10-16
- **Branch:** feature/add-access-control

## Context

The admin portal has one shared password (in `.env`) and whoever knows it can do everything. During the puja, different volunteers run different things: one runs the pandal speaker, another runs musical chair, another checks registrations. Each should get only the access they need (least privilege), with their own login, so a mistake or a leaked password can't touch the rest of the site. The current `.env` admin becomes the **Super Admin**.

## Requirements

### Data model (what is stored)

- **Users**: each person who can sign in. Name, username (unique), optional phone and email, password (stored only as a hash), role, active/disabled, created date, last sign-in. Private: never readable by visitors (anon).
- **Roles**: human-readable names such as `pandal-speaker-admin`, `musical-chair-admin`, plus a description. Two built-in roles always exist: **Super Admin** and **Audience**.
- **Permission sets**: an id, a name, and four switches: **create, read, update, delete**. A role is given one or more permission sets.
- **Permission set programmes**: links a permission set to the programmes it applies to (bridge table, one row per programme).
- **Permission set areas**: links a permission set to the non-programme parts of the admin portal it applies to. Areas: Pandal stream, Songs, Song requests, Feedback, Years, Settings, Registrations (all programmes page) and **All programmes** (every programme, including ones created later, and creating new programmes).

### Least privilege

- No permission set means no access. A new role starts with nothing.
- A user's access is the sum of their role's permission sets: an action is allowed only if some set on their role has that switch on **and** is linked to that programme or area.
- **Audience**: all four switches off, no programmes, no areas. An audience user can't open any admin page; signing in tells them they have no access to the admin portal.
- **Super Admin** can do everything, always. Only the Super Admin can manage users, roles and permission sets; this can't be granted to anyone else.
- A disabled user can't sign in, and is signed out on their next page load or action.
- Changing a user's role, or a role's permission sets, takes effect on the user's next page load or action (no need to sign out and in).

### Signing in

- `/admin/login` asks for **username and password**.
- The Super Admin signs in with username `superadmin` and the existing password from `.env`. That username is reserved; no user row can take it.
- Other users sign in with the username and password the Super Admin gave them.
- Wrong username or password shows one generic "Wrong username or password" (no hint which was wrong). The existing rate limit on attempts stays.
- After this ships, everyone (including the current admin) signs in once again.

### Checks on every admin URL

- Opening any `/admin/...` URL (pages and their actions/uploads) first checks **authentication** (signed in, user active), then **authorisation** (has the right permission for that programme or area).
- Not signed in: sent to `/admin/login`, then back to the page they wanted.
- Signed in but not allowed: a clear "You don't have access to this page" screen with a link to the dashboard (no crash, no data shown).
- The same checks run on the server for every admin action (save, delete, start round, play song, upload, etc.), so hiding a button is never the only protection. A refused action sends the user to the no-access page, which says "You don't have permission to do that." (a toast can't carry the message: production builds hide server action errors).
- In code this is one call at the top of each admin page and server action, from one shared utility (e.g. `checkPermission(...)`).

### What each switch means

- **Read**: can open the page and see its data. Without read on a programme or area, its nav link and list entries are hidden.
- **Create**: can add new things there (e.g. add a registration, add songs, add rounds/questions, create a programme with All programmes).
- **Update**: can change existing things and run live consoles (edit a registration, start/stop musical chair, play/skip on the stream, change settings).
- **Delete**: can delete things there (registrations, songs, rounds, etc.).
- Create/update/delete without read is not useful; the Users & roles page warns when a set has them without read.
- Buttons for actions the user isn't allowed are hidden or disabled.

### What each user sees

- The nav shows only the pages they can read. The dashboard shows only counts and links for what they can read.
- **Programmes** list shows only programmes they can read; "New programme" only with create on All programmes.
- **Registrations** (all programmes) page shows only registrations of programmes they can read, and only if they have read on the Registrations area.
- The header shows who is signed in (name and role) next to Log out.

### Users & roles page (Super Admin only)

- A new **Users & roles** admin page, in the nav only for the Super Admin.
- **Users**: list, add (name, username, optional phone/email, role, starting password), edit details and role, set a new password, disable/enable. No delete (disable instead), so history stays.
- **Roles**: list, add, rename, describe, choose which permission sets the role has. The two built-in roles can't be deleted or renamed. A role with users can't be deleted.
- **Permission sets**: list, add, edit (name, four switches, which programmes, which areas), delete if no role uses it.
- Works at 360px.

## Out of scope

- Public sign-up or visitor accounts (Audience users are only created by the Super Admin for now).
- Users changing their own password, "forgot password" or email/SMS login.
- Row-level (Postgres RLS) enforcement per user; admin writes still go through the server with the service-role key, and the checks live in the server code.
- Audit log of who changed what.
- Per-field permissions (e.g. "can edit a registration's name but not phone").
- Changing anything on the public site.

## Assumptions

- Login is username + password checked by our server (no Supabase Auth). Passwords are hashed with a slow, salted hash.
- The Super Admin stays defined by `.env` (not a database row), so a broken database can never lock the organisers out.
- Sessions stay in a signed, http-only cookie, now carrying the user's id; existing admin cookies stop working once this ships.
- The Brain Games console, Musical chair console, Drawings, Results and Registrations pages under a programme all use that programme's permissions.
- Uploads (Cloudinary signing) need create or update on any programme or area: the signing route can't tell what the file is for, and the database write that uses the file is checked by its own action.
- Seeded data: the two built-in roles only. No example roles; the Super Admin makes them (e.g. `pandal-speaker-admin` = read + update on Pandal stream).
- The migration only adds new tables and is applied to the shared database before the PR is merged.

## Acceptance criteria

1. Sign in as `superadmin` with the `.env` password: every page works as today, plus a **Users & roles** page.
2. Wrong password, or an unknown username: "Wrong username or password"; too many tries are rate-limited.
3. As Super Admin, create a permission set "ZZ stream ops" (read + update, area Pandal stream), a role `ZZ-pandal-speaker-admin` with it, and a user `zzspeaker` with that role.
4. Sign in as `zzspeaker` in another browser: the nav shows only Dashboard and Pandal stream. Play/skip/volume work. Approve/reject works (update). "Remove song" is hidden (no delete).
5. As `zzspeaker`, open `/admin/songs`, `/admin/settings`, `/admin/users` and a programme URL by hand: each shows "You don't have access to this page".
6. As `zzspeaker`, call a songs or settings server action directly (e.g. replay a captured request): refused: they land on the no-access page ("You don't have permission to do that."), nothing changes in the DB.
7. Give a set "ZZ musical chair" (read + create + update, one musical chair programme) to a role `ZZ-mc-admin` and user `zzmc`: the Programmes list shows only that programme; its console and registrations work; delete buttons are hidden; other programmes and `/admin/programmes/new` are refused.
8. Remove "ZZ stream ops" from `ZZ-pandal-speaker-admin` while `zzspeaker` is signed in: their next page load, or their next click on the open stream page, shows the no-access page.
9. Disable `zzspeaker`: their next page load sends them to the login page, and signing in again is refused.
10. Create user `zzaudience` with role Audience and sign in: "You don't have access to the admin portal"; no admin page opens.
11. Try to create a user named `superadmin`: refused. Try to delete Super Admin or Audience roles: not possible. Delete a role that still has users: refused.
12. Not signed in, open `/admin/stream`: sent to login, then back to `/admin/stream` after signing in.
13. Public site (`/`, `/programmes/...`, `/music`) works unchanged and without signing in.
14. Users & roles page and the no-access screen work at 360px with no sideways scroll.
15. Clean up: delete the `ZZ` users (in the database, since the page only disables), roles and permission sets afterwards.

## Plan

Spec: `.claude/specs/0005-admin-access-control.md` (approved). Branch `feature/add-access-control`.

### Context

The admin portal has one `.env` password, and whoever has it can do everything. We need personal logins with least privilege:

- users have a role;
- a role has permission sets (create/read/update/delete switches);
- each set is linked to programmes or admin areas;
- the `.env` admin becomes the Super Admin.

Every admin page, action and upload checks who is signed in and what they're allowed, through one shared utility.

### Design in one paragraph

`src/lib/permissions.ts` loads the signed-in admin once per request (React `cache`) and exposes **one call: `await checkPermission(action, target)`**:

- **Not signed in, or disabled:** redirect to `/admin/login?next=…`.
- **Signed in but not allowed:** redirect to `/admin/no-access`.
- **Allowed:** returns the session.

Pages and server actions both call it on their first line.

**Deviation from the spec:** when an action is refused, the user goes to the no-access page ("You don't have permission to do that.") instead of seeing a toast. In production, Next.js replaces errors thrown from server actions with a generic message, so a toast could only say "Something went wrong". A redirect gets the real message through and needs no change in ~15 client components. I'll update spec criteria 6 and 8 to match. Redirects instead of thrown errors work the same in pages, actions and production builds (thrown action errors are redacted to a generic message in production). The rule itself is a pure function `can(session, action, target)`, which is also used to hide buttons.

### 1. Migration `supabase/migrations/0013_access_control.sql` (additive only)

- `roles` (id uuid pk, `name` text unique, description, `built_in` bool, created_at). Seeds two rows: `super-admin` and `audience`, both `built_in`.
- `permission_sets`: id uuid pk, `name` text unique, `can_create`, `can_read`, `can_update` and `can_delete` (bool, default **false**), created_at.
- `role_permission_sets`: role_id → roles on delete cascade, permission_set_id → permission_sets on delete restrict, pk (role_id, permission_set_id).
- `permission_set_programmes`: permission_set_id → cascade, programme_id → programmes cascade, pk of both.
- `permission_set_areas`: permission_set_id → cascade, `area` text with a check constraint in (`all_programmes`, `registrations`, `stream`, `songs`, `song_requests`, `feedback`, `years`, `settings`), pk of both.
- `users`:
    - id uuid pk, `name`, `username` text not null. Unique index on `lower(username)`, plus a check `lower(username) <> 'superadmin'`.
    - `phone`, `email`, `password_hash` text not null.
    - `role_id` → roles **on delete restrict**, so a role with users can't be deleted.
    - `active` bool default true, created_at, `last_login_at`.
- RLS is enabled on all six tables with **no policies**, and all privileges are revoked from anon and authenticated. Only the service role (`db()`) reads them.
- Indexes on the foreign keys.
- `src/lib/database.types.ts`: add the row types by hand, as the existing file does.
- **Apply before merging.** The Supabase MCP is not connected here, so the user applies it (or reconnects the MCP and I apply it).

### 2. Auth core

**`src/constants.ts`** gets:

- `SUPER_ADMIN_USERNAME = "superadmin"`;
- `ADMIN_AREAS` (the area keys above, as const) and `ADMIN_AREA_LABEL`;
- `PERMISSION_ACTIONS = ["create","read","update","delete"]`;
- `NO_ACCESS_PATH = "/admin/no-access"`.

**`src/lib/password.ts`** (new, server-only): `hashPassword(plain)` and `verifyPassword(plain, stored)`.

- Uses node `crypto.scrypt`, a 16-byte random salt and `timingSafeEqual`.
- Format: `scrypt$<N>$<r>$<p>$<salt b64>$<hash b64>`.
- No new dependency.

**`src/lib/session-token.ts`**:

- `signAdminToken(subject)` puts `sub` (`"superadmin"` or a user id) in the JWT.
- `verifyAdminToken(token)` returns the `sub` or null. Old tokens (`role: "admin"`, no `sub`) fail, so everyone signs in again.
- `proxy.ts` keeps its optimistic check through the new verify. There's no DB access in the proxy.

**`src/lib/auth.ts`**:

- `startAdminSession(subject)`, `endAdminSession()` and `isCorrectPassword` stay.
- `isAdmin` and `requireAdmin` are removed. Every caller moves to the new API, and `bun run typecheck` proves none are left.

**`src/lib/permissions.ts`** (new, server-only). This is the only place the rules live.

- `type AdminTarget = { area: AdminArea } | { programmeId: string } | { rowOf: ProgrammeChildTable; id: string }`.
    - `ProgrammeChildTable` is one of `registrations`, `quiz_rounds`, `quiz_questions`, `drawings`, `musical_chair_rounds` or `musical_chair_requests`.
    - The `rowOf` form looks up the row's `programme_id`. That covers actions that only get a child id, such as `deleteQuestion(id)` or `moveToEnd(registrationId)`.
- `type AdminSession = { kind: "super"; name: "Super Admin"; roleName: "Super Admin" } | { kind: "user"; id; name; roleName; grants: Grant[] }`.
    - `Grant = { create, read, update, delete, programmeIds: Set<string>, areas: Set<AdminArea> }`, one per permission set.
- `getAdminSession = cache(async () => …)`:
    - reads the cookie and verifies the token;
    - for `superadmin`, returns the super session;
    - otherwise does **one** query: the `users` row (must be `active`) with `roles(name, role_permission_sets(permission_sets(*, permission_set_programmes(programme_id), permission_set_areas(area))))`;
    - returns null when there's no session.
- `can(session, action, target)` is pure, and Super Admin always gets true. Otherwise a grant matches when its `action` switch is on and either:
    - it's an area target and the grant links that area;
    - it's a programme target and the grant links that programme **or** `all_programmes`.
- `hasAnyAccess(session)`: Super Admin, or some grant that has read and at least one link.
- `checkPermission(action, target)`: the one call. It does the redirects described above (the `next` path comes from the `x-pathname` header set in the proxy) and returns the session.
- `checkSignedIn()`: an authenticated session with any access. Used by `translateForAdmin` and the layout.
- `checkSuperAdmin()`: for the Users & roles page and actions.
- `permissionFlags(session, target) → { create, read, update, delete }`: serialisable, passed to client components to hide buttons.
- `readableProgrammeIds(session) → "all" | Set<string>`: filters the lists.

**Login** (`src/actions/admin-auth.ts` and `src/components/admin/login-form.tsx`):

- The form gets a **username** field (with autocomplete set to username).
- The rate limit runs first.
- `superadmin` is checked with `isCorrectPassword` (the env password).
- Any other username: load the user by `lower(username)` and require `active`, then `verifyPassword`.
    - For an unknown user it still hashes a dummy value, so the timing is the same.
    - Any failure returns "Wrong username or password."
- A valid user with no access (Audience, or a role with no grants) gets "You don't have access to the admin portal." and no session.
- On success it updates `last_login_at` and calls `startAdminSession(sub)`.

**Layout and no-access page:**

- `src/app/admin/(protected)/layout.tsx` calls `checkSignedIn()`.
- It builds the nav links the session can read and passes them to `AdminNav` with `{ name, roleName }`. `AdminNav` shows "name · role" by Log out and only the given links.
- **Users & roles** (`/admin/users`) is linked only for Super Admin.
- `src/app/admin/no-access/page.tsx` is outside `(protected)`, like login, so there's no redirect loop. It says "You don't have access to this page" (or "…the admin portal" when the session has no access at all). It links to the Dashboard (when they have any access) and has a Log out button. Works at 360px.

**Proxy** (`src/proxy.ts`): sets the request header `x-pathname` for `/admin` requests, so pages can build `next=`.

### 3. Wire every page and action (one line each)

The pattern is `await checkPermission("<action>", <target>);` as the first line, replacing `requireAdmin()`. Calls go outside any `try`, or the redirect gets swallowed.

**Pages** (`src/app/admin/(protected)/…`):

- **Dashboard:** counts and links only for readable areas and programmes.
- **`programmes`:** list filtered by `readableProgrammeIds`; the "New programme" button only when `can(create, all_programmes)`.
- **`programmes/new`:** create on `all_programmes`.
- **`programmes/[id]` and its sub-pages** (registrations, brain-games, musical-chair, drawings, results): read on `{ programmeId: id }`.
- **`registrations`:** read on area `registrations`, and rows filtered to readable programmes.
- **`stream`, `songs`, `song-requests`, `feedback`, `years`, `settings`:** read on their area.
- **`users`** (new): `checkSuperAdmin()`.

**Actions:**

| File                               | Calls                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `brain-games.ts`                   | `saveRound` / `saveQuestion`: create (new) or update (existing) on `programmeId`. `deleteRound` / `deleteQuestion`: delete on `rowOf`. ask / askRandom / hide / mark / undo / setRoundStatus / saveLeaderboardToResults: update.                                                                                                                                                                                                                       |
| `programmes.ts`                    | `saveProgramme`: new → create `all_programmes`, existing → update programme. `deleteProgramme`: delete programme. patch / shuffle / setOrderLocked / callNext / saveResults: update programme. `setPerformanceStatus` / `moveToEnd`: update `rowOf registrations`. `deleteRegistration`: delete `rowOf registrations`.                                                                                                                                 |
| `registrations.ts`                 | create: create on programme. update: update `rowOf registrations`.                                                                                                                                                                                                                                                                                                                                                                                     |
| `content.ts` songs                 | add / addMusicalChairSong: create `songs`. edit / updateSong: update `songs`. delete: delete `songs`.                                                                                                                                                                                                                                                                                                                                                  |
| `content.ts` musical chair console | `addSongsToMusicalChairPool(programmeId, songIds)` and `addMusicalChairRequestToPool`: create on the programme. **Signature change:** the console passes `programmeId`. `rejectMusicalChairRequest`: update `rowOf musical_chair_requests`. `recordRound` / `finishMusicalChair`: update programme. `setRoundEliminated`: update `rowOf musical_chair_rounds`. `setMusicalChairGender`: update `rowOf registrations`. `resetRounds`: delete programme. |
| `content.ts` drawings              | add: create programme. update / delete: `rowOf drawings`. publish: update programme.                                                                                                                                                                                                                                                                                                                                                                   |
| `content.ts` other                 | song requests: update / delete `song_requests`. feedback: update / delete `feedback`. event / donation / ambient / whatsapp settings: update `settings`. startEdition: create `years`. makeEditionCurrent: update `years`.                                                                                                                                                                                                                             |
| `stream.ts`                        | approve / reject / quota / start / stop / advance / setUpNext: update `stream`. addLibrarySongsToStream: create `stream`. removeStreamSong: delete `stream`.                                                                                                                                                                                                                                                                                           |
| `translate.ts`                     | `checkSignedIn()`                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Upload route** `src/app/api/cloudinary/sign/route.ts`:

- Not signed in: 401.
- No create or update switch on any grant: 403.
- The DB write that follows the upload is checked by its own action.
- **Deviation from the spec's assumption:** the route doesn't know the target programme or area. I'll update the spec's Assumptions to match.

**Hiding buttons:**

- Pages compute `permissionFlags(session, target)` and pass a `can` prop to their main client component.
- Create, update and delete controls render only when the matching flag is true.
- Components to touch:
    - `stream-console.tsx` (Remove: delete; Approve, Play and Skip: update; the library: create);
    - `songs-manager.tsx`;
    - `musical-chair-console.tsx`;
    - `brain-games-console.tsx`;
    - `all-registrations.tsx` and `registration-actions.tsx`;
    - `drawings-manager.tsx`;
    - `results-editor.tsx`;
    - `feedback-inbox.tsx`;
    - `song-requests-manager.tsx`;
    - `edition-forms.tsx`;
    - `settings-forms.tsx`;
    - `programme-form.tsx` (and its Delete).
- Super Admin gets all true, so today's UI is unchanged for them.

### 4. Users & roles page (Super Admin)

**Actions:** `src/actions/admin/access.ts`. Every one starts with `checkSuperAdmin()`, validates with zod and returns `ActionState` or `{ ok, message }` for toasts.

- **Users:**
    - `createUser`, `updateUser` (name, username, phone, email, role);
    - `setUserPassword` (minimum 8 characters);
    - `setUserActive`.
    - **Username rules:** `^[a-z0-9._-]{3,32}$`, never `superadmin`, and unique, with a friendly message on a unique violation.
    - **Role rule:** the `super-admin` role can't be assigned.
- **Roles:**
    - `createRole`, `updateRole` (name, description, `permissionSetIds`; replaces the `role_permission_sets` rows);
    - `deleteRole`: refused for built-in roles or a role with users.
    - **Built-in roles:** name locked, and Audience can't be given permission sets.
- **Permission sets:**
    - `savePermissionSet` (name, four switches, `programmeIds[]`, `areas[]`; replaces the link rows);
    - `deletePermissionSet`: refused while a role uses it.

**Page and components:**

- **Page:** `src/app/admin/(protected)/users/page.tsx` with three sections (Users, Roles, Permission sets), using the existing `AdminCard` / `AdminTitle`.
- **Components** in `src/components/admin/access/`: `users-manager.tsx`, `roles-manager.tsx` and `permission-sets-manager.tsx`, following the inline-form pattern of `songs-manager.tsx` (`useActionState` + `useActionToast`, `NativeSelect`, `Switch`, `Checkbox`).
- **Programme picker:** programmes grouped by year, newest first.
- **Warning:** "has create/update/delete without read" when that's the case.
- **Confirmation:** AlertDialog for deletes.
- **Layout:** `grid-cols-1` base everywhere for 360px.

### 5. Docs

- Spec: append this plan, set the status (`planned`, then `implemented`) and add a `**Migration:** 0013_access_control.sql` header line.
- Assumptions: update the upload-route note.
- `.claude/context.md`:
    - Admin line: access control, `checkPermission`, Users & roles.
    - Rules that bite: "every admin page/action starts with `checkPermission`; latest migration 0013".
    - Suggestions: own-password change, audit log, `rate_limits` cleanup.

### Critical files

- **New:** `supabase/migrations/0013_access_control.sql`, `src/lib/permissions.ts`, `src/lib/password.ts`, `src/actions/admin/access.ts`, `src/app/admin/no-access/page.tsx`, `src/app/admin/(protected)/users/page.tsx`, `src/components/admin/access/*`
- **Changed:**
    - auth plumbing: `src/lib/auth.ts`, `src/lib/session-token.ts`, `src/proxy.ts`, `src/constants.ts`, `src/lib/database.types.ts`;
    - login: `src/actions/admin-auth.ts`, `login-form.tsx`;
    - shell: `(protected)/layout.tsx`, `admin-nav.tsx`;
    - all `src/actions/admin/*.ts`, every admin `page.tsx`, the client consoles and managers listed in §3, and `api/cloudinary/sign/route.ts`.

### Verification

1. `bun run typecheck`, `lint`, `format:check` and `build`. Typecheck also proves no `requireAdmin` / `isAdmin` callers are left: `grep -rn "requireAdmin\|isAdmin" src` must be empty.
2. **Scratch checks** (not committed):
    - **`can()` cases:** area grant, programme grant, `all_programmes`, a switch off, no links, Audience, Super Admin.
    - **Password helpers:** hash and verify round trip, wrong password, tampered hash.
    - **Session tokens:** sign and verify of both subject kinds, and an old-format token rejected.
3. **Headless smoke test of the shell** with dummy env:
    - `/admin/stream` without a cookie → login with `next`;
    - a signed `superadmin` token → the layout renders, then fails at DB reads with dummy env, which is expected;
    - `/admin/no-access` renders at 360px.
4. **The user runs acceptance criteria 1–15** on a prod build (port 3140) with the real env, **after applying migration 0013**. Then clean up the `ZZ` users, roles and sets.

## As built

What differs from the plan above:

- **Single round trip per request:** the session loads through the SQL function `admin_session(user_id)`. Saving a permission set (`save_permission_set`) and a role's sets (`set_role_permission_sets`) are SQL functions too, so link rows are replaced in one transaction. All three are service-role only.
- **Pure rules live apart:** `can()`, `permissionFlags()`, `hasAnyAccess()`, `readableProgrammeIds()` and `visibleAdminPages()` are in `src/lib/access-rules.ts`, with no I/O. `src/lib/permissions.ts` loads the session and redirects.
- **Hiding buttons:** pages pass their flags through `<AdminPermissions>` (`src/components/admin/admin-permissions.tsx`), and components read them with `useAdminCan()`. The settings forms and the programme form use `<fieldset disabled>` when there's no update.
- **Musical chair console:**
    - `addMusicalChairRequestToPool` checks the request's own programme (`rowOf`) instead of taking a new `programmeId`.
    - "Remove" on a pool song now calls the new `removeFromMusicalChairPool(programmeId, songId)`, which needs delete on the programme, not on Songs.
- **Read-only stream console:** without update it plays no sound, so a viewer's open tab never advances the playlist.
- **Verification:** ran all 13 migrations on a local Postgres 16 behind PostgREST, with the prod build on port 3140. The headless run covered acceptance criteria 1–14 (58 checks, all pass). It also ran 12 unit checks of the rules, password hashing and tokens.
