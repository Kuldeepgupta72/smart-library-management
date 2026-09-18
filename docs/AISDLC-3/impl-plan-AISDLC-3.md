# Implementation Plan — AISDLC-3: Add pagination to members list

## Phase Overview
1. **Shared Pagination Extraction** — pull the existing `parsePagination`
   helper (and its `DEFAULT_PAGE` / `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`
   constants) out of `src/routes/books.ts` into a shared module, and
   re-point `books.ts` at it, so there is a single implementation before
   `members.ts` starts depending on it.
2. **Members Endpoint Changes** — wire the shared helper into
   `GET /api/members`, replace `SELECT *` with the explicit
   `SELECT id, name, email`, add the `LIMIT`/`OFFSET`/`COUNT` query logic,
   and shape the response as `{ members, page, pageSize, total, totalPages }`.
3. **Automated Test Coverage** — add the automated tests the acceptance
   criteria require for the paginated endpoint, adding minimal test
   scaffolding to the app repo first since none currently exists there.
4. **Regression Verification** — confirm `GET /api/books` pagination
   behavior is unchanged after the extraction, and that
   `GET /api/members/search` (unaffected by this story) and the response
   shape both hold end-to-end.

## Task List
| ID | Description | Complexity | Depends On |
|---|---|---|---|
| T1 | Extract `parsePagination` and its `DEFAULT_PAGE`/`DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE` constants out of `src/routes/books.ts` into a new shared module (e.g. `src/utils/pagination.ts`); update `books.ts` to import from it instead of defining it locally | LOW | none |
| T2 | Import the shared `parsePagination` helper in `src/routes/members.ts` and call it on `req.query.page` / `req.query.pageSize` inside the `GET /` handler | LOW | T1 |
| T3 | Replace the members list SQL (`SELECT * FROM members ORDER BY id ASC`) with an explicit `SELECT id, name, email ... ORDER BY id ASC LIMIT ? OFFSET ?`, plus a matching `SELECT COUNT(*) AS total FROM members` query, mirroring the `buildBooksQuery`/count pattern in `books.ts` | MEDIUM | T2 |
| T4 | Compute `total`, `totalPages` (same `total === 0 ? 0 : Math.ceil(total / pageSize)` rule as books), and return `{ members, page, pageSize, total, totalPages }` from `GET /api/members` | LOW | T3 |
| T5 | Add minimal automated-test scaffolding to the app repo (none exists today — no test runner in `package.json`); default to Node's built-in `node --test` + `assert` to avoid adding a new dependency without confirmation, and add a corresponding `test` script in `package.json` | MEDIUM | none |
| T6 | Write automated tests for `GET /api/members` covering: default pagination (no query params), explicit `page`/`pageSize` values, and the `pageSize` cap at 100 | MEDIUM | T4, T5 |
| T7 | Regression-check `GET /api/books` after the T1 extraction: confirm filter, sort, and pagination behavior are byte-for-byte unchanged (same response shape, same defaults, same cap) | LOW | T1 |

## Blocked Tasks
None. Note (not a blocker): T5 assumes `node --test` as the lightest-weight
option since the app repo currently has zero test-framework dependencies;
if the human prefers a different test runner (e.g. Jest), T5/T6 will be
adjusted at execution time without changing scope.

## Complexity Summary
4 LOW (T1, T2, T4, T7), 3 MEDIUM (T3, T5, T6), 0 HIGH. Overall story
complexity: MEDIUM — the endpoint change itself closely mirrors the
already-implemented `GET /api/books` pattern (LOW-MEDIUM), but the story
also has to introduce test scaffolding from scratch in the app repo to
satisfy the "automated tests in app repo" acceptance criterion, which
adds real (if contained) complexity beyond a pure copy-paste of the books
pagination pattern.
