---
name: save-spec
description: "Use whenever the user asks Claude to plan and implement (or just plan) a feature, change or fix for this app. Saves the approved plan as a numbered spec file in .claude/specs/ so the history of what was planned, and in what order, is kept in the repo."
---

# Save the plan as a numbered spec

Every time the user asks you to plan and implement something in this app, the plan is saved as a spec in `.claude/specs/`. The number shows which spec was added first.

## When

After the plan is approved (the user accepts it, or says to go ahead) and **before writing any code**. If you worked in plan mode, do this right after leaving it. Skip it for trivial one-line fixes and for questions that involve no plan.

## How

1. **Find the next number.** List `.claude/specs/`. File names look like `0007-short-kebab-title.md`. The next number is the highest existing number plus one, zero-padded to 4 digits (`0001` if the folder is empty). Never reuse or renumber a spec.
2. **Name the file** `NNNN-short-kebab-title.md`: three to six words naming the feature, lowercase.
3. **Write the spec** with this header, followed by the plan itself (Context, Approach, Files, Not changing, Verification):

   ```markdown
   # NNNN: Title

   - **Status:** planned
   - **Date:** YYYY-MM-DD
   - **Branch:** current git branch
   - **Migration:** supabase/migrations/00NN_name.sql (only if there is one)
   ```

4. **Keep it a faithful copy of the approved plan.** If the user changed the plan during review, save the final version, not the first draft.
5. **When the work is done and verified,** change `Status` to `implemented` and add the migration name if one was created. If the plan changed while building, update the spec so it matches what shipped.
6. Mention the spec file name in your final report to the user. Do not commit it unless the user asks you to commit.
