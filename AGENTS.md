# AGENTS.md

Canonical AI instruction file for this repository. Tool-specific
files (`.claude/CLAUDE.md`) are thin stubs that point here — update
this file, not those.

> **Note on `.github/copilot-instructions.md`:** this repo already has
> a separate, hand-maintained Copilot instructions file describing an
> Agentic SDLC pipeline that a fleet of Claude/Copilot agents run
> against Jira story `AISDLC-{{NUMBER}}` (see `.claude/agents/`,
> the Pipeline Rules section below, and `.claude/config/pipeline-config.md`
> for the authoritative pipeline definition). That file is intentionally
> left untouched here — this `AGENTS.md` instead covers the underlying
> **application** (the Smart Library Management System itself) that the
> pipeline builds. If you're an agent asked to run a pipeline stage
> (Jira lookup, requirements, planning, design, dev, review, deploy,
> test, docs), read the Pipeline Rules section below and
> `.claude/commands/run-pipeline.md` first — those rules govern
> pipeline behavior and take precedence over general app conventions
> below when the two overlap.

## What this app is

A small library management system: track books, members, and loans.
Node.js + Express backend (TypeScript), SQLite storage via the
built-in `node:sqlite` module (`DatabaseSync` — requires Node >= 22.5;
this environment runs Node v24.8.0), plain HTML/CSS/vanilla TypeScript
frontend (no framework, no bundler). Single Express server on port
5050 serves both the static frontend and the JSON REST API
(`src/server.ts`).

## Project Structure

```
├── src/                       # TypeScript source (compiled, not run directly)
│   ├── server.ts              # Express entry point, port 5050
│   ├── validators.ts          # calculateDueDate, calculateFine, isDuplicateIsbn, email validation
│   ├── db/
│   │   └── database.ts        # Schema creation + additive/idempotent migrations (node:sqlite)
│   ├── routes/
│   │   ├── books.ts           # GET/POST /api/books (paginated, unique-ISBN enforced)
│   │   ├── members.ts         # GET/POST /api/members, GET /api/members/search (paginated)
│   │   └── loans.ts           # GET /api/loans, GET /api/loans/overdue, POST issue/return/pay-fine/waive-fine
│   ├── utils/
│   │   └── pagination.ts      # parsePagination(rawPage, rawPageSize) — shared by books.ts + members.ts
│   └── client/
│       └── app.ts             # Vanilla TS frontend logic (compiled to public/app.js)
├── tests/                      # node:test integration tests (see Testing below)
│   ├── helpers/build-test-app.ts   # spins up an isolated Express+SQLite instance per test file
│   ├── *.test.ts
│   └── evidence/               # human-reported pipeline test-run logs (not app-level test output)
├── public/                    # Static assets served by Express (index.html, style.css, app.js)
├── docs/{{STORY_ID}}/          # Per-story pipeline artifacts (requirements/plan/design/logs)
├── data/                      # SQLite database file (gitignored)
├── dist/                      # tsc output for src/ and tests/ (gitignored)
├── .claude/, .github/          # Agentic SDLC pipeline definitions — see note above
├── build.js, deploy-local.js  # Local build-artifact + deploy scripts (see BUILD.md)
├── tsconfig.json               # Backend TS config
├── tsconfig.client.json        # Frontend TS config
└── tsconfig.tests.json         # Test TS config (separate rootDir from src build)
```

## Database Schema

Three tables only — **never introduce a fourth table or invent
columns/endpoints beyond what's below** (this constraint is enforced
pipeline-wide, see Pipeline Rules Rule 4 below):

- **books** — `id`, `title`, `author`, `isbn` (unique index,
  `idx_books_isbn_unique`, created only if no duplicates already
  exist), `is_available`
- **members** — `id`, `name`, `email` (no uniqueness constraint on
  email yet)
- **loans** — `id`, `book_id` (FK), `member_id` (FK), `issued_date`,
  `due_date`, `returned_date` (null while active), `fine_amount`
  (REAL, null until first computed), `fine_paid` (0/1), `fine_waived`
  (0/1)

Schema is created and migrated automatically on server start
(`src/db/database.ts`). New columns are added via `ALTER TABLE ... ADD
COLUMN`, guarded by a `PRAGMA table_info` existence check — this
pattern is additive and idempotent; follow it for any future schema
change rather than dropping/recreating tables.

## API Endpoints

| Method | Endpoint                  | Notes |
|--------|---------------------------|-------|
| GET    | `/api/books`              | Paginated (`page`, `pageSize` query params) |
| POST   | `/api/books`               | `title`, `author`, `isbn`; rejects duplicate ISBNs |
| GET    | `/api/members`            | Paginated |
| GET    | `/api/members/search`     | `?q=` by name or email |
| POST   | `/api/members`             | `name`, `email`; validates email format |
| GET    | `/api/loans`              | All active (unreturned) loans |
| GET    | `/api/loans/overdue`      | Active + past due; additively includes `days_overdue`, `fine_amount`, `fine_paid`, `fine_waived` |
| POST   | `/api/loans/issue`         | `book_id`, `member_id`; sets a 14-day due date |
| POST   | `/api/loans/return`        | `loan_id` |
| POST   | `/api/loans/:id/pay-fine`   | Marks a fine paid (status flag only, no real payment processing, no auth check) |
| POST   | `/api/loans/:id/waive-fine` | Marks a fine waived (no auth check) |

Pagination (`src/utils/pagination.ts`): `page`/`pageSize` query
params, default page size 20, capped at 100, non-numeric/invalid
values fall back to defaults. Shared by `books.ts` and `members.ts` —
reuse it rather than reimplementing parsing in a new route.

## Testing

`npm test` → `npm run build && tsc -p tsconfig.tests.json && node
--test dist/tests/*.test.js`. Uses Node's built-in `node:test` runner
(no Jest/Mocha/Vitest dependency). Each test file runs in its own
process; `tests/helpers/build-test-app.ts` builds an isolated
Express app backed by a fresh temp-file SQLite DB per file (set
`LIBRARY_DB_PATH` to the temp file *before* first importing the
compiled route/db modules — `node:sqlite`'s connection is opened at
module-load time and cached, so this must happen before any import).
Route handlers already include `try/catch` error handling; keep that
pattern for new endpoints.

## Coding Standards

- TypeScript/JavaScript for this app; no other language without being asked
- camelCase for functions/variables
- Every route handler needs error handling (see existing `try/catch` blocks in `src/routes/*.ts`)
- Never hardcode credentials — read from environment variables (`.env`, gitignored)
- Never invent app data — only the three tables above; no new tables/columns/endpoints without an approved design doc

## Build & Deploy

```bash
npm install
npm run build      # tsc for backend (tsconfig.json) + frontend (tsconfig.client.json)
npm start           # node dist/server.js
npm run dev         # build then start
npm run build:artifact  # packages a deployable zip into artifacts/ (see BUILD.md)
npm run deploy:local    # extracts latest artifact into deploy/ and runs it (see BUILD.md)
```

See `BUILD.md` for the full build/deploy pipeline, including how
database persistence works across redeployments.

## Pipeline Rules

Every agent and subagent in the Agentic SDLC pipeline (`.claude/agents/`,
`.claude/skills/`) follows these numbered rules. They live here —
not in a separate rules file — so a guardrail only ever needs to
change in one place, and every agent/skill's own `## Rules` section
just points back to this section by number.

### 1. Jira — Read-Only, One Narrow Create Exception
- Only `jira-agent` may call the project's `jira` MCP server
  (`.mcp.json`, backed by `@aashari/mcp-server-atlassian-jira`), and
  only via the `jira-reader` skill
- `jira-reader` is GET-only (`mcp__jira__jira_get`) for browsing the
  backlog or fetching a story (Modes 1-2, 4). The **only** write
  action permitted anywhere in the pipeline is `jira-reader` Mode 3
  — creating exactly one new Story issue via `mcp__jira__jira_post`,
  from a human-approved title/description/acceptance criteria draft
  (optional Stage 0, see `jira-agent.md`). No agent — `jira-agent`
  included — may call `mcp__jira__jira_put`, `mcp__jira__jira_patch`,
  or `mcp__jira__jira_delete`, ever, even though the MCP server
  exposes those tools
- If a stage would normally reflect a status change back to Jira
  (e.g. "story now in development"), it must NOT do this
  automatically — tell the human to update Jira manually if needed
- No agent other than `jira-agent` may be granted the `mcp__jira__*`
  tools or attempt to reach Jira directly
- Stage 0 (create) is optional and additive — the existing Stage 1a
  entry points (`/run-pipeline`, `/run-pipeline AISDLC-{{NUMBER}}`)
  are unchanged and do not require it

### 2. GitHub — Scoped Write Access
- Only `git-committer` may commit/push (via local `git`, not the
  MCP server); only `pr-creator` may open or update a PR (via the
  project's `github` MCP server, `.mcp.json`, backed by
  `@modelcontextprotocol/server-github`); only `pr-commenter` may
  post PR comments (also via the `github` MCP server) — no agent
  writes git history or calls `mcp__github__*` tools outside these
  skills
- No agent ever calls `mcp__github__merge_pull_request` or otherwise
  merges a PR — merging is always a manual human action, confirmed
  back to the agent in chat
- No agent pushes directly to `main`/`GITHUB_DEFAULT_BRANCH` —
  always via a feature branch per `pipeline-config.md` naming rules
- Requirements/Design subagents never commit or open a PR (local
  files only). Planner Subagent is the one exception: on APPROVE of
  the plan, it may create the feature branch, commit the
  already-approved requirements + plan docs, and open the one Dev PR
  with a partial body — Developer Agent (Stage 4) reuses that same
  branch/PR rather than opening a second one, and updates its body
  once code exists — see `docs-agent.md` / `planner-subagent.md`

### 3. Confluence — Two Named Pages, Scoped Space
- Only `confluence-agent` and `design-subagent` may call
  `confluence-publisher`, which talks to the project's `confluence`
  MCP server (`.mcp.json`, backed by
  `@aashari/mcp-server-atlassian-confluence`) via
  `mcp__confluence__conf_get`/`conf_post`/`conf_put`
- Each may only create or update its own one named page per story,
  in space `AISDLC` — `confluence-agent`: the Batch Summary page;
  `design-subagent`: the Design page — never call
  `mcp__confluence__conf_delete`, never touch pages outside that
  space or that don't match the story's title format

### 4. Data Integrity — Never Invent
- Every fact in a generated document must trace back to a real
  source: a Jira API response, a file actually read, or a human's
  answer in chat — never fabricated
- If information is genuinely missing, mark it `[pending]` (or ask
  the human) — never guess or fill a gap silently
- App schema constraint: tables are only `books`, `members`,
  `loans` — never invent additional tables, columns, or endpoints

### 5. Security
- Never hardcode credentials, tokens, or passwords in generated
  code or docs — always read from environment variables
- `.env` is never read into context, written to, or committed by
  any skill (enforced in `file-writer` and `git-committer`)

### 6. Checkpoints
- Never skip a human checkpoint silently, even on a stage marked
  skippable in `pipeline-config.md` — skipping still requires
  explicit human confirmation, and gets logged in
  `docs/{{STORY_ID}}/pipeline-log.md` with a note that it was
  skipped
- Nothing that posts or publishes externally (PR comments,
  Confluence page) proceeds without the human seeing the exact
  content first and confirming

### 7. Scope Discipline
- Each stage only touches the files it owns — e.g. Design Subagent
  never edits `impl-plan-{{STORY_ID}}.md`, Developer Agent only
  implements what's in the approved design/plan, not extra
  "while I'm here" changes
- A rejected checkpoint routes back to the agent that owns the
  rejected file — it does not restart the whole pipeline
- On REJECT: ask what specifically is wrong, then make a targeted
  edit to just the affected section(s) — never regenerate an
  entire document/review from scratch on a REJECT. This keeps
  revisions fast and makes it obvious to the human what actually
  changed between attempts.

## Known Documentation Drift

None currently known. `README.md`'s "Intentional Limitations" section
previously listed "no overdue detection or fines" and "no pagination"
as gaps after both had already been implemented (via pipeline stories
`AISDLC-2` and `AISDLC-3` respectively) — that section has been
corrected. Both Jira stories still show status "To Do" as of this
writing; per Rule 1, no pipeline agent may transition them — update
`AISDLC-2` and `AISDLC-3` to Done in Jira manually if desired.
