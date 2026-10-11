---
name: wrap-up
description: "Summarize what has been done in this session, then update .claude/context.md so the next session starts with an accurate, short picture of the project. Run it at the end of a working session, before /compact or /clear."
disable-model-invocation: true
---

# Wrap up the session

Two jobs, in this order: tell the user what happened, then make `.claude/context.md` true again. The context file is what a future session reads first, so a stale line there costs more than a missing one.

## 1. Summarize the session

Write a short summary for the user, in plain text:

- **Done:** what was built, fixed or decided, one line each. Name the spec (`.claude/specs/NNNN-*.md`) when there is one.
- **Not done or uncommitted:** check `git status --short` and `git log --oneline -5` instead of relying on memory. Say plainly what is not committed, not deployed, or not tested.
- **Needs the user:** anything waiting on them (env vars, a deploy, a decision).

Keep it under about 15 lines.

## 2. Update `.claude/context.md`

Follow the rules in `CLAUDE.md` ("Keeping context current"):

- Add each new or changed feature as one line under the right section. Remove lines for things that no longer exist.
- Add any new "rule that bites" learned this session (a gotcha that would cost the next session time), and drop ones that stopped being true.
- Bump `Last updated` and `Specs done`. Check each spec's `Status:` line in `.claude/specs/` so the count is right.
- Update "Suggested improvements": add what you noticed, remove what was done or declined. This list is Claude's own; don't ask the user to approve it.
- Check any claim you are unsure of against the repo (file exists, migration number, script name) before writing it.
- Keep the file around 60 lines. One line per feature, no code, no history. Detail belongs in the specs.

Show the user a one-line description of what changed in the file.

## 3. Finish with a reminder

Close with: "Context saved. Run /compact to free up the conversation."

A skill or hook cannot run `/compact` itself: it is a command the user types, and hooks only run shell commands. Don't try to trigger it. If the user wants automatic compaction, point them to auto-compact in `/config`.
