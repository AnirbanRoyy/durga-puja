---
name: spec-driven
description: "Use when the user asks for a big change, a new feature or an enhancement to this app (anything that needs more than a one-line fix). Runs the spec-driven flow: write a numbered spec in .claude/specs/, get it approved, plan in plan mode on Opus 5.5, get the plan approved, then implement on Sonnet 5.5 in the mode the user picks."
---

# Spec-driven development

For any non-trivial request, do not jump to code or to a plan. Turn the request into a spec first, then plan from the spec, then implement. Skip this flow for one-line fixes, typos and plain questions.

Stop at each checkpoint below and wait for the user. Never run two stages in one turn.

## 1. Write the spec

1. **Number it.** List `.claude/specs/`. Files are named `NNNN-short-kebab-title.md`. The next number is the highest existing one plus one, zero-padded to 4 digits (`0001` if empty). Never reuse or renumber.
2. **Write it from the user's words.** If something decides the outcome and can't be settled from the request or the code, ask with AskUserQuestion; otherwise pick the sensible default and note it under Assumptions. Look at the code only enough to write accurate requirements. Do not design the solution here.
3. **Use this shape:**

    ```markdown
    # NNNN: Title

    - **Status:** draft
    - **Date:** YYYY-MM-DD
    - **Branch:** current git branch

    ## Context

    Why this is needed, in a few sentences.

    ## Requirements

    What must be true when it's done. One bullet per behaviour, from the user's side of the screen.

    ## Out of scope

    What this deliberately does not do.

    ## Assumptions

    Defaults chosen where the request was silent.

    ## Acceptance criteria

    Checks that prove it works (what to click, what should happen).
    ```

4. **Checkpoint:** tell the user the file name and ask them to review it. They approve it or ask for changes. Apply changes to the same file. Do not plan or code yet.

## 2. Plan on Opus 5.5

Once the user approves the spec:

1. Set `Status: approved` in the spec.
2. Enter plan mode with EnterPlanMode.
3. Tell the user to switch the model to Opus 5.5 with `/model`. You cannot change the model yourself, so ask once and carry on if they already have it.
4. Read the spec, explore the code, and write the plan to the plan file: approach, critical files, existing code to reuse, and a verification section. The plan follows the spec's requirements and acceptance criteria and adds nothing outside them.
5. Present it with ExitPlanMode. The user reviews it and approves or asks for changes.

## 3. Choose how to implement

After the plan is approved:

1. Append the approved plan to the spec under `## Plan` and set `Status: planned`. Add `**Migration:**` to the header if the plan includes one.
2. Ask with AskUserQuestion how to run the implementation: **Auto** (edits go ahead without asking each time) or **Manual** (the user approves each edit). Tell the user to switch the model back to Sonnet 5.5 with `/model` and, if they chose, the permission mode with Shift+Tab. You cannot change either yourself.
3. Implement the plan. Verify against the spec's acceptance criteria.
4. When it works, set `Status: implemented` and update `.claude/context.md` (see CLAUDE.md): add the feature in one line, bump "Specs done", and add or remove items under "Suggested improvements". If the build differed from the plan, update the spec to match what shipped.
5. Mention the spec file name in the final report. Do not commit unless asked.
