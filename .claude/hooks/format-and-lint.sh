#!/usr/bin/env bash
# Stop hook: when a turn left code files changed, format the whole codebase with Prettier, then lint.
# Lint failures are sent back to Claude (decision: block) so they get fixed before the turn ends.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Already continuing because of this hook: don't loop.
if grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then exit 0; fi

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
STATE="$(git rev-parse --git-dir)/claude-format-state"

# Fingerprint of the working tree: skips turns that changed nothing since the last run.
signature() { { git status --porcelain; git diff HEAD; } 2>/dev/null | git hash-object --stdin; }

# Only code files count; spec/markdown-only turns don't need a lint run.
git status --porcelain | grep -Eq '\.(ts|tsx|js|jsx|mjs|css|json)$' || exit 0

before="$(signature)"
[ -f "$STATE" ] && [ "$before" = "$(cat "$STATE")" ] && exit 0

bunx prettier --write . >/dev/null 2>&1
lint_output="$(bun run lint 2>&1)"
lint_status=$?
signature >"$STATE"

if [ $lint_status -ne 0 ]; then
    LINT_OUTPUT="$lint_output" bun -e '
const out = process.env.LINT_OUTPUT ?? "";
const reason = "Prettier ran on the whole codebase, but `bun run lint` failed. Fix these lint errors:\n\n" + out.slice(-3500);
console.log(JSON.stringify({ decision: "block", reason }));
'
    exit 0
fi

echo '{"systemMessage":"Prettier formatted the codebase and lint passed."}'
