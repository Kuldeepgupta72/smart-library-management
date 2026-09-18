# Design — AISDLC-3: Add pagination to members list

## Architecture Document

No new services, processes, or external dependencies are introduced.
This story only refactors and extends the existing Express route
layer of the single-process Node.js/TypeScript app (port 5050,
SQLite via `src/db/database`).

New/changed components:
- **`src/utils/pagination.ts` (NEW)** — shared module owning
  `parsePagination(rawPage, rawPageSize)` and the constants
  `DEFAULT_PAGE` (1), `DEFAULT_PAGE_SIZE` (20), `MAX_PAGE_SIZE` (100).
  Extracted verbatim (same defensive try/catch fallback behavior) from
  `src/routes/books.ts`. Single responsibility: validate/normalize
  pagination query params. No DB access, no Express types — pure
  function, importable by any route module.
- **`src/routes/books.ts` (CHANGED)** — removes its local
  `parsePagination`/constants, imports them from
  `src/utils/pagination.ts` instead. No behavioral change; `GET
  /api/books` handler logic (filter, sort, LIMIT/OFFSET/COUNT,
  response shape) is untouched.
- **`src/routes/members.ts` (CHANGED)** — `GET /` handler imports
  `parsePagination` from the shared module, replaces the
  `SELECT * FROM members ORDER BY id ASC` (no pagination) query with
  an explicit `SELECT id, name, email ... LIMIT ? OFFSET ?` query plus
  a `SELECT COUNT(*) AS total FROM members` query, and returns
  `{ members, page, pageSize, total, totalPages }` instead of a bare
  array. `GET /search` and `POST /` are untouched.
- **Test scaffolding (NEW)** — `node --test` based test files (no new
  npm dependency), plus a `test` script added to `package.json`.

```
Client / curl
     |
     |  GET /api/members?page=&pageSize=
     v
+--------------------------+        +------------------------------+
|  src/routes/members.ts   |  uses  |  src/utils/pagination.ts      |
|  GET /  (CHANGED)        |------->|  parsePagination()  (NEW,     |
|  GET /search (unchanged) |        |  extracted from books.ts)     |
|  POST / (unchanged)      |        +------------------------------+
+------------|-------------+                     ^
             | SELECT id,name,email              | imports (no local copy)
             | LIMIT/OFFSET + COUNT(*)            |
             v                          +------------------------------+
      +-------------+                   |  src/routes/books.ts         |
      |   members   |  (SQLite table)   |  GET / (unchanged behavior)  |
      +-------------+                   +------------------------------+
```

Responsibilities stay cleanly separated: `pagination.ts` only parses
numbers; `books.ts`/`members.ts` each own their own SQL and response
shaping; no cross-route coupling beyond the shared helper import.

## HLD (High-Level Design)

- **Tables affected:** `members` (query pattern only — no schema/DDL
  change). `books` and `loans` are unaffected.
- **Endpoints affected:**
  - `GET /api/members` — behavior change: now accepts `page` and
    `pageSize` query params and returns a paginated envelope instead
    of a flat array.
  - `GET /api/members/search` — unchanged (still returns a flat
    array, no pagination per requirements).
  - `POST /api/members` — unchanged.
  - `GET /api/books` — no functional change; only its pagination
    parsing is now delegated to the shared helper (regression-checked
    per T7).
- **UI screens affected:** none. `public/index.html` and
  `src/client/app.ts` are explicitly out of scope per requirements and
  will not be modified.

## LLD (Low-Level Design)

### `src/utils/pagination.ts` (new module)
```ts
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(
  rawPage: unknown,
  rawPageSize: unknown
): { page: number; pageSize: number } {
  // identical logic/try-catch fallback as current books.ts version:
  // - non-integer/non-positive rawPage -> DEFAULT_PAGE
  // - non-integer/non-positive rawPageSize -> DEFAULT_PAGE_SIZE
  // - pageSize capped at MAX_PAGE_SIZE via Math.min
}
```
`books.ts` deletes its local copy and does
`import { parsePagination } from '../utils/pagination';`.

### `GET /api/members` — new signature
```
GET /api/members?page={{int, optional, default 1}}&pageSize={{int, optional, default 20, max 100}}
```
Response (200):
```json
{
  "members": [ { "id": 1, "name": "...", "email": "..." } ],
  "page": 1,
  "pageSize": 20,
  "total": 42,
  "totalPages": 3
}
```
Validation: identical to `GET /api/books` — invalid/missing
`page`/`pageSize` silently fall back to defaults; never 400/500 on bad
pagination input (matches existing `parsePagination` contract).

### SQL changes (`src/routes/members.ts`)
Replace:
```sql
SELECT * FROM members ORDER BY id ASC
```
With:
```sql
SELECT id, name, email FROM members ORDER BY id ASC LIMIT ? OFFSET ?
```
and a companion count query:
```sql
SELECT COUNT(*) AS total FROM members
```
Handler logic (mirrors `books.ts` `buildBooksQuery`/count pattern):
```ts
const { page, pageSize } = parsePagination(req.query.page, req.query.pageSize);
const countRow = db.prepare('SELECT COUNT(*) AS total FROM members').get() as { total: number };
const total = countRow.total;
const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
const offset = (page - 1) * pageSize;
const members = db.prepare(
  'SELECT id, name, email FROM members ORDER BY id ASC LIMIT ? OFFSET ?'
).all(pageSize, offset);
res.json({ members, page, pageSize, total, totalPages });
```
No changes to `GET /search` or `POST /` bodies, params, or SQL.

### Test scaffolding (`node --test`)
- Add `"test": "node --test dist/tests/**/*.test.js"` (or equivalent
  path matching the project's build output) to `package.json` scripts
  — no new devDependency.
- New test file(s), e.g. `tests/members-pagination.test.ts` (compiled
  by existing `tsc` build), using Node's built-in `node:test` +
  `node:assert` modules only.
- Test cases (per T6):
  1. Default pagination (no query params) → `page: 1, pageSize: 20`,
     response envelope shape present.
  2. Explicit `page`/`pageSize` (e.g. `?page=2&pageSize=5`) → correct
     `LIMIT`/`OFFSET` slice and echoed `page`/`pageSize`.
  3. `pageSize` cap: `?pageSize=500` → `pageSize` clamped to 100 in
     the response.
- T7 regression check: run/extend existing manual or automated checks
  against `GET /api/books` confirming filter/sort/pagination/response
  shape are byte-for-byte unchanged after the `parsePagination`
  extraction.

## Wireframes

No UI screens are affected by this story (backend-only, frontend
explicitly out of scope). No wireframe is produced.

## Self-Review Findings

| Severity | Finding | Recommendation |
|---|---|---|
| LOW | `pagination.ts` extraction touches a helper shared with the already-shipped `books.ts` endpoint, creating a (small) regression risk to existing filter/sort behavior | Mitigated by T7 in the impl plan — explicit regression check of `GET /api/books` after extraction; no code changes to `books.ts` logic beyond the import swap |
| LOW | No integration test currently exists validating `GET /api/members/search` and `POST /api/members` remain unaffected end-to-end | Add a quick smoke assertion in the new test file confirming `/search` still returns a flat array and `POST /` still returns 201, to lock in the "unchanged" requirement rather than relying on manual inspection alone |
| LOW | `total`/`totalPages` are computed from an unfiltered `COUNT(*) FROM members` with no `WHERE` clause, unlike `books.ts`'s count query which mirrors its `WHERE` | Not a bug today since `GET /api/members` (unlike `GET /api/books`) has no filter query params in scope — flagged only so a future filter addition doesn't forget to keep count and select `WHERE` clauses in sync |

## Overall Decision
APPROVED — the design stays fully within the existing three-table
schema (`books`/`members`/`loans`), introduces no new dependencies,
mirrors the already-proven `books.ts` pagination pattern, and all
findings are LOW severity with concrete mitigations already captured
in the impl plan (T7) or addressable as a one-line test addition.
