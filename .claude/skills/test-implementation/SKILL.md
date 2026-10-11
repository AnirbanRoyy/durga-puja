---
name: test-implementation
description: 'Use when the user wants tests written and run for a feature or change in this app, for example "test the stream library feature", "write tests for spec 0002", "stress-test the team registration", "try to break the quota reset" or "verify this works with bun test". Writes independent tests with bun test from the requirements (not from the implementation), runs them, and reports a summary and per-test results. Use it whenever the user asks to test, verify, harden or find bugs in something that was built, even if they don''t say "bun test".'
---

# Test an implementation independently

The point of these tests is to find what the implementation gets wrong. Tests written by reading the code and checking that it does what it does always pass and prove nothing. So write them from the **requirements**, and read the code only for its public surface.

## Input

The user names a feature or change. Resolve it to a **requirements source**, in this order:

1. A spec in `.claude/specs/` (match by number or title; use its Requirements and Acceptance criteria).
2. The user's own description in the conversation.
3. If neither exists, ask the user to state the expected behaviour in a few lines. Do not infer requirements from the code.

State the behaviours you will test back to the user in a short list before writing tests, so a wrong reading is caught early.

## Step 1: Learn only the public surface

Read what a caller could see: exported function names and signatures, types in `src/lib/database.types.ts`, server action names and their return shapes (`ActionState`, `{ ok, message }`), SQL function signatures and grants in `supabase/migrations/`, route paths, form field names. Do not read function bodies or SQL bodies until Step 4. If you have already read the implementation earlier in this conversation, say so and lean on the requirements, not on what you remember of the code.

## Step 2: Design the cases

For each requirement, write cases that try to break it, not just confirm it:

- **Normal use:** the behaviour as described.
- **Boundaries:** off-by-one at every limit (max teams, 3 requests per network, min/max members), empty, one, exactly at the limit, one past it.
- **Bad input:** blank, whitespace only, very long, wrong type, duplicate, Bengali and other Unicode, emoji, characters like quotes and `%`.
- **State changes:** doing it twice, undo and redo, doing it in the wrong order, acting on something already deleted or changed.
- **Concurrency:** two simultaneous calls for the same thing (use `Promise.all`) where a limit or uniqueness rule exists.
- **Permissions and privacy:** admin-only actions refuse a visitor; private data (phones, hashed IPs) is not returned by public queries.
- **Side effects that must not happen:** quotas not consumed, other rows untouched, no leftover locks.

Prefer many small, sharply named tests over a few large ones. A test name should read as the requirement it checks.

## Step 3: Write the tests

- Put them in `tests/<feature-name>/` as `*.test.ts`, using `import { describe, test, expect } from "bun:test"`.
- Test pure logic (validators, parsers, helpers) directly. Test database behaviour through the RPCs and queries with the service-role client, the way the app calls them.
- Importing `server-only` modules throws under bun. If `tests/setup.ts` doesn't exist, create it with `mock.module("server-only", () => ({}))` and point to it with a `bunfig.toml` entry `[test] preload = ["./tests/setup.ts"]`. Path aliases like `@/lib/...` already work through `tsconfig.json`.
- The database is shared with production. Never touch real rows. Prefix everything you create with `ZZ`, delete it in `afterAll`/`finally` even when a test fails, and restore any state you changed (for example `stream_state`). Do not run tests that delete or alter data you didn't create. Use the service-role key from `.env.local`.
- Do not mock what you are testing. Mock only things outside the feature, like Redis or the network.

## Step 4: Run and judge

Run `bun test tests/<feature-name>` (add `--timeout 30000` for database tests). When a test fails, work out why before touching anything:

1. **Re-read the requirement.** Is the test asserting something the requirement doesn't say? If yes, the test is wrong: fix the test and note it.
2. **Otherwise it's a finding.** Now you may read the implementation to understand the cause and write it up.

Do not edit the implementation to make tests pass, and do not loosen an assertion to turn red into green. The user decides whether to fix findings. If a requirement is ambiguous, mark the test as ambiguous in the report instead of guessing.

Run the suite a second time if any test involves timing or concurrency, so flaky results are visible.

## Step 5: Report

Finish with this report, in plain text:

```
Test report: <feature> (<spec file or "from description">)
Result: <passed>/<total> passed, <failed> failed, <skipped> skipped  (<time>)

Failures (real bugs)
- <test name>: expected <x>, got <y>. Cause: <one line>. Where: <file:line>

Test mistakes fixed
- <test name>: <what was wrong with the test>

Ambiguous requirements
- <behaviour>: <what the spec doesn't settle>

All tests
  PASS  <test name>
  FAIL  <test name>
  ...

Not covered
- <what couldn't be tested and why, e.g. needs a real browser or phone>
```

Leave out an empty section. Mention where the tests live and how to rerun them (`bun test tests/<feature-name>`). Do not commit unless asked.
