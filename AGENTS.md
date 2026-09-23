# AGENTS.md

Canonical AI instruction file for this repository. Tool-specific
files (`.claude/CLAUDE.md`) are thin stubs that point here — update
this file, not those.

> **Note on `.github/copilot-instructions.md`:** this repo already has
> a separate, hand-maintained Copilot instructions file describing an
> Agentic SDLC pipeline that a fleet of Claude/Copilot agents run
> against Jira story `AISDLC-{{NUMBER}}` (see `.claude/agents/`,
> `.claude/rules/pipeline-rules.md`, `.claude/config/pipeline-config.md`
> for the authoritative pipeline definition). That file is intentionally
> left untouched here — this `AGENTS.md` instead covers the underlying
> **application** (the Smart Library Management System itself) that the
> pipeline builds. If you're an agent asked to run a pipeline stage
> (Jira lookup, requirements, planning, design, dev, review, deploy,
> test, docs), read `.claude/rules/pipeline-rules.md` and
> `.claude/agents/orchestrator-agent.md` first — those rules govern
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
pipeline-wide, see `pipeline-rules.md` Rule 4):

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

## Known Documentation Drift

`README.md`'s "Intentional Limitations" section is stale — it still
lists "no overdue detection or fines" and "no pagination" as
intentional gaps, but both have since been implemented (overdue
detection + fines via the pipeline story `AISDLC-2`, pagination via
`AISDLC-3`). Trust this file and the actual code over that section
until README.md is updated.
