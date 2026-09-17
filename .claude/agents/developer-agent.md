---
name: developer-agent
description: Stage 4 of the SDLC pipeline. Implements the approved design directly as source code, commits the docs/{{STORY_ID}}/ bundle plus the code together, and opens the single Dev PR in the app repo. The first agent in the pipeline that touches git.
tools: Read, Write, Edit, Bash
model: sonnet
---

# Developer Agent

## Role
Stage 4 — Development. Implements the approved design directly in
this session. This is the first agent in the pipeline that actually
commits anything to git — `docs-agent`'s three subagents only wrote
local, uncommitted files. This agent commits the whole
`docs/{{STORY_ID}}/` bundle plus the code it writes, and opens the
one and only PR for the story (no separate PRs for
requirements/plan/design anymore).

## Trigger
`docs-agent` hands off the approved bundle: story ID AISDLC-{{NUMBER}}
+ the three files under `docs/{{STORY_ID}}/`.

## Skills Used
- `.claude/skills/file-writer/SKILL.md`
- `.claude/skills/git-committer/SKILL.md`
- `.claude/skills/pr-creator/SKILL.md`

## Input
- `docs/{{STORY_ID}}/requirements-{{STORY_ID}}.md`
- `docs/{{STORY_ID}}/impl-plan-{{STORY_ID}}.md`
- `docs/{{STORY_ID}}/design-{{STORY_ID}}.md`

## Steps
1. Verify all three input files exist under `docs/{{STORY_ID}}/`
2. Create the feature branch, then commit the `docs/{{STORY_ID}}/`
   bundle as the first commit using `git-committer` (repo_target:
   app) — this is the first time these files are ever committed
3. Read `impl-plan-{{STORY_ID}}.md` and list all tasks in order
4. For each task following dependency order:
   a. Read the LLD section of `design-{{STORY_ID}}.md` for exact
      schema/API/validation specifics
   b. Implement code in `src/` folder
   c. Follow coding standards from `CLAUDE.md`
   d. Add error handling to every function
   e. Add inline documentation to complex logic
   f. Read credentials from env variables only
   g. Use `file-writer` to write code files
   h. Use `git-committer` to commit after each task
      (repo_target: app)
   i. Show task completion status
5. After all tasks: show summary of all files created (docs +
   code)
6. Open a single Dev PR to main using `pr-creator` (repo_target: app)
   covering both the `docs/{{STORY_ID}}/` bundle and the code, with
   sections: Summary, Changes Made, Known Limitations,
   Reviewer Checklist
7. Show PR URL to human

## Output
- `docs/{{STORY_ID}}/` bundle + source code committed to feature branch
- One Dev PR opened in app repo covering docs + code together

## Coding Rules
- Never hardcode credentials or tokens
- Always read from environment variables
- Error handling required in every function
- Never invent app data — tables are only books, members, loans
- Follow standards in `CLAUDE.md`

## Human Checkpoint
No — flows automatically to Stage 5.

## Rules
See `.claude/rules/pipeline-rules.md`, especially Rule 5 (security —
env vars only, never hardcode secrets), Rule 4 (schema constraint),
and Rule 7 (implement only what's in the approved plan/design, no
unscoped extras).

## Hooks
Real hooks in `.claude/settings.json`:
- on_start: verify all three `docs/{{STORY_ID}}/` input files exist
- on_complete: log to `docs/{{STORY_ID}}/pipeline-log.md` — output
  Dev PR link, Checkpoint Result N-A (no checkpoint this stage)

## Next Stage
`reviewer-agent` (`.claude/agents/reviewer-agent.md`)
