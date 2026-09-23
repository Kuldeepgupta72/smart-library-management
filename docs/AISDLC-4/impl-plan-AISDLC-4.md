# Implementation Plan — AISDLC-4: Enforce email uniqueness on member creation

## Phase Overview
1. **Validator** — add `isDuplicateEmail` to `src/validators.ts`, mirroring
   `isDuplicateIsbn`'s query-then-check pattern (AC2).
2. **Schema migration** — add the additive/idempotent unique index
   (`idx_members_email_unique`) on `members.email` in
   `src/db/database.ts`, guarded against pre-existing duplicate emails,
   mirroring the `idx_books_isbn_unique` migration (AC3).
3. **Route enforcement** — wire `isDuplicateEmail` into `POST
   /api/members` in `src/routes/members.ts` to reject duplicate emails
   with a 409-style response mirroring the books duplicate-ISBN
   rejection, while leaving valid creation and `/api/members/search`
   unchanged (AC1, AC4).
4. **Tests** — add `node:test` integration coverage for the new
   duplicate-email rejection, non-duplicate creation, and the
   migration's guard behavior, following the existing pattern in
   `tests/`.

## Task List
| ID | Description | Complexity | Depends On |
|---|---|---|---|
| T1 | Add `isDuplicateEmail(email, excludeId?)` to `src/validators.ts`, following the same `db.prepare(...).get()` existence-check pattern as `isDuplicateIsbn` (AC2, Q1) | LOW | none |
| T2 | Add additive/idempotent migration in `src/db/database.ts`: scan `members` for existing duplicate emails (`GROUP BY email HAVING COUNT(*) > 1`), warn and skip if found, otherwise `CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique ON members(email)` — mirrors `idx_books_isbn_unique` (AC3, Q1, Q5) | LOW | none |
| T3 | In `src/routes/members.ts`'s `POST /api/members` handler, call `isDuplicateEmail` before insert and return the same 409-style rejection shape/status used by `POST /api/books` for duplicate ISBN when it returns true; leave all other logic (name/email validation, success path) untouched (AC1, AC4, AC5, Q3) | MEDIUM | T1, T2 |
| T4 | Add/extend `node:test` integration tests: (a) duplicate email on `POST /api/members` is rejected with the expected status, (b) non-duplicate member creation still succeeds unchanged, (c) `GET /api/members/search` behavior is unaffected, (d) migration does not throw when pre-existing duplicate emails are present in a fresh test DB seeded with duplicates | MEDIUM | T3 |

## Blocked Tasks
None — no task is blocked pending external input; T3 is sequenced after
T1 and T2 (needs both the helper and the index to exist first), and T4
is sequenced after T3 (tests exercise the route behavior T3 implements).

## Complexity Summary
2 LOW, 2 MEDIUM. Overall story complexity: LOW-MEDIUM — single new
validator function, one additive/idempotent index migration mirroring
an existing precedent (`idx_books_isbn_unique`), and a scoped route
change confined to `POST /api/members`; no new tables, columns beyond
the index, or endpoints (AC5), consistent with `AGENTS.md`'s schema
constraint.
