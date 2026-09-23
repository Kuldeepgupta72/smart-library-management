# How to Use AI with Smart Library Management

_A practical guide to working on this repo with AI coding assistants_

## Two things this repo is, at once

1. **A small Node/Express/TypeScript/SQLite app** — the Smart Library
   Management System itself (see `AGENTS.md` for its structure, schema,
   API, and testing conventions).
2. **The definition of an Agentic SDLC pipeline** that builds and
   documents that app, one Jira story (`AISDLC-{{NUMBER}}`) at a time,
   with a human checkpoint at nearly every stage. The pipeline's own
   rules live in `.claude/rules/pipeline-rules.md` and
   `.claude/config/pipeline-config.md`; its orchestration lives in
   `.claude/agents/orchestrator-agent.md`.

Which one you're working on changes what "correct" looks like. If
you're fixing a bug in `src/routes/loans.ts`, `AGENTS.md` is your
guide. If you're changing how a pipeline stage behaves (what
`developer-agent` does, what `reviewer-agent` checks, how Confluence
pages get published), the pipeline files above are the source of
truth.

## Core Principles

- **Human checkpoints are load-bearing, not decorative.** Every
  pipeline stage that writes externally (Jira, GitHub, Confluence)
  waits for an explicit human APPROVE on the *exact* content first —
  see `pipeline-rules.md` Rule 6. Don't relay a stage's own request
  for approval as if it were already given.
- **Jira is read-only, with exactly one narrow exception.** Only
  `jira-agent` talks to Jira, and the only write it may ever perform
  is creating a new Story from a human-approved draft (`jira-reader`
  Mode 3, Stage 0). Nothing else — no updates, transitions, comments,
  or deletes, ever (`pipeline-rules.md` Rule 1).
- **Never invent facts.** Every claim in a generated requirements/
  design/summary doc must trace back to a real source — a Jira
  response, a file actually read, or something a human said in chat.
  Genuinely missing information gets marked `[pending]`, not guessed
  (Rule 4).

## Running the pipeline

```
/run-pipeline                    # Backlog Mode — lists open AISDLC stories
/run-pipeline AISDLC-{{NUMBER}}  # Single Story Mode — runs one story end to end
/resume-pipeline AISDLC-{{NUMBER}}  # Resume after a crash/token-limit/network failure
```

Both slash commands invoke `orchestrator-agent`, which delegates to
the stage agents in `.claude/agents/`. If the backlog comes back
empty, `orchestrator-agent` hands off automatically to
`gap-scanner-agent`, which scans this repo for grounded enhancement
candidates (README gaps, missing validation, stale docs, etc.) and
lets you pick which ones — if any — to turn into a new Jira story.

## Working on the app itself (not the pipeline)

- Read `AGENTS.md` first — it has the real schema, endpoints, and
  test setup, verified against the current source.
- `npm run build` then `npm start` to run it locally at
  `localhost:5050`; `npm test` runs the `node:test` integration
  suite.
- Match existing patterns: additive/idempotent SQLite migrations in
  `src/db/database.ts` (see the `due_date`/fine-columns examples),
  `try/catch` error handling in every route handler, shared
  pagination via `src/utils/pagination.ts` rather than reimplementing
  it per route.
- `README.md`'s "Intentional Limitations" section is stale (see the
  note in `AGENTS.md`) — don't treat it as current.

## Testing & Review

Before considering a change done:

- `npm run build` compiles with no errors
- `npm test` passes (the `node:test` suite under `tests/`)
- New routes follow the existing `try/catch` + validation pattern
- If the change came through the pipeline, the relevant stage's
  checkpoint was genuinely shown to a human and approved — not
  assumed

## Skills available in this repo

`.claude/skills/` holds the reusable technical actions the pipeline
agents call: `jira-reader`, `confluence-publisher`, `git-committer`,
`pr-creator`, `pr-commenter`, `file-writer`, `test-results-recorder`.
Each has required env vars and a `## Pre-flight Checks` section — read
the skill file before assuming what it does; several have real,
previously-hit gotchas documented inline (e.g. Confluence's
`representation: "storage"` requirement, Atlassian's JQL quoting
rules).

## Getting Started Checklist

1. ✅ Read `AGENTS.md` (app conventions) and, if touching the
   pipeline, `.claude/rules/pipeline-rules.md`
2. ✅ `npm install && npm run build && npm test` to confirm a clean
   baseline
3. ✅ For pipeline work: skim `.claude/agents/orchestrator-agent.md`
   for the full 10-stage flow before changing any single stage
4. ✅ Check `.env` has the vars a stage needs before running it
   (`JIRA_*`, `GITHUB_*`, `CONFLUENCE_*` — see each skill's
   `## Required Environment Variables`)

## Questions?

This is a single-maintainer personal project — there's no team
Slack channel or CODEOWNERS to route questions to yet. Check
`.claude/rules/pipeline-rules.md` and `.claude/config/pipeline-config.md`
first; they're the most detailed and most frequently updated docs in
the repo.
