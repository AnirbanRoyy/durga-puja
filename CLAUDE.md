# Durga Puja app

@AGENTS.md
@.claude/context.md

## Code style

- Always use braces, even for a one-line `if`/`else`/loop: `if (x) { return; }`, never `if (x) return;`.
- Shared constants go in `src/constants.ts`; reusable helper functions stay in `src/lib/`. Braces are enforced by ESLint (`curly: all`).
- Prefer readable, maintainable code over compact code: named variables and small functions instead of dense one-liners, nested ternaries or clever chains.

## Keeping context current

- Read `.claude/context.md` first: it says what is already built, the rules that bite, and the open suggestions. Don't re-explore what it already covers.
- After finishing an implementation (end of the spec-driven flow, or any change that adds, removes or changes a feature), update `.claude/context.md`: add the feature in one line under the right section, bump "Specs done" and the date, and add or remove items in "Suggested improvements".
- Keep it short (about 60 lines). One line per feature; no code, no history. Detail belongs in `.claude/specs/`.
