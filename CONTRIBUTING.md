# Contributing

## Setup

```bash
npm install
npm run build
npm test
```

Requires Node.js >= 22.5 (uses the built-in `node:sqlite` module).
See `AGENTS.md` for the full project structure, database schema, and
API endpoints.

## Making a change

- Follow the existing patterns in `src/`: additive/idempotent SQLite
  migrations in `src/db/database.ts`, `try/catch` error handling in
  every route handler, shared pagination via `src/utils/pagination.ts`.
- Add or update `node:test` integration tests under `tests/` for any
  route/behavior change; run `npm test` before opening a PR.
- Never introduce a fourth database table, or a column/endpoint not
  covered by an approved design — the schema is intentionally scoped
  to `books`, `members`, `loans`.

## Branch & commit conventions

If your change goes through the Agentic SDLC pipeline
(`.claude/agents/orchestrator-agent.md`), branches and commits follow
a fixed format defined in `.claude/config/pipeline-config.md`:

- Branch: `feature/claude-{{STORY_ID}}-{{short-description}}`
  (e.g. `feature/claude-AISDLC-2-overdue-fines`)
- Commit message: `[{{STORY_ID}}] {{description}}` (lowercase
  imperative, under 72 characters)

For manual changes outside the pipeline, a descriptive branch name
and commit message following the same spirit is fine.

## Pull requests

- Keep PRs scoped to one change/story.
- If the pipeline opened the PR, its body already has the required
  sections (Summary, Changes Made, Known Limitations, Reviewer
  Checklist) — fill in any left as `[pending]` before merge.
- No agent ever merges a PR automatically — merging is always a
  manual human action.

## AI-assisted contributions

See `HOWTOAI.md` for how AI coding assistants and the Agentic SDLC
pipeline fit into this repo, and `AGENTS.md` for the canonical
project/coding conventions.
