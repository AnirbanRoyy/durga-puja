# 0005: Admin access control (users, roles, permission sets)

- **Status:** draft
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
- The same checks run on the server for every admin action (save, delete, start round, play song, upload, etc.), so hiding a button is never the only protection. A refused action shows an error toast "You don't have permission to do that."
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
- Uploads (Cloudinary signing) need create or update on the programme or area the upload is for.
- Seeded data: the two built-in roles only. No example roles; the Super Admin makes them (e.g. `pandal-speaker-admin` = read + update on Pandal stream).
- The migration only adds new tables and is applied to the shared database before the PR is merged.

## Acceptance criteria

1. Sign in as `superadmin` with the `.env` password: every page works as today, plus a **Users & roles** page.
2. Wrong password, or an unknown username: "Wrong username or password"; too many tries are rate-limited.
3. As Super Admin, create a permission set "ZZ stream ops" (read + update, area Pandal stream), a role `ZZ-pandal-speaker-admin` with it, and a user `zzspeaker` with that role.
4. Sign in as `zzspeaker` in another browser: the nav shows only Dashboard and Pandal stream. Play/skip/volume work. Approve/reject works (update). "Remove song" is hidden (no delete).
5. As `zzspeaker`, open `/admin/songs`, `/admin/settings`, `/admin/users` and a programme URL by hand: each shows "You don't have access to this page".
6. As `zzspeaker`, call a songs or settings server action directly (e.g. replay a captured request): refused with "You don't have permission to do that", nothing changes in the DB.
7. Give a set "ZZ musical chair" (read + create + update, one musical chair programme) to a role `ZZ-mc-admin` and user `zzmc`: the Programmes list shows only that programme; its console and registrations work; delete buttons are hidden; other programmes and `/admin/programmes/new` are refused.
8. Remove "ZZ stream ops" from `ZZ-pandal-speaker-admin` while `zzspeaker` is signed in: their next page load shows no access to the stream.
9. Disable `zzspeaker`: their next page load sends them to the login page, and signing in again is refused.
10. Create user `zzaudience` with role Audience and sign in: "You don't have access to the admin portal"; no admin page opens.
11. Try to create a user named `superadmin`: refused. Try to delete Super Admin or Audience roles: not possible. Delete a role that still has users: refused.
12. Not signed in, open `/admin/stream`: sent to login, then back to `/admin/stream` after signing in.
13. Public site (`/`, `/programmes/...`, `/music`) works unchanged and without signing in.
14. Users & roles page and the no-access screen work at 360px with no sideways scroll.
15. Clean up: delete the `ZZ` users (in the database, since the page only disables), roles and permission sets afterwards.
