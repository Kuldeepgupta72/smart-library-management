# Requirements — AISDLC-4: Enforce email uniqueness on member creation

## Story Overview
- **Summary**: Enforce email uniqueness on member creation
- **Status**: To Do
- **Assignee**: Unassigned
- **Story Points**: [pending]
- **Description**: `POST /api/members` (`src/routes/members.ts`) currently has
  no uniqueness check on `email`, while `POST /api/books` enforces ISBN
  uniqueness via `isDuplicateIsbn()` (`src/validators.ts:27`;
  `src/routes/books.ts:105-108`). `AGENTS.md`'s Database Schema section
  explicitly flags this gap: "members — id, name, email (no uniqueness
  constraint on email yet)." Duplicate member emails are currently allowed,
  which is inconsistent with the books table's ISBN handling and can cause
  ambiguous lookups in `/api/members/search`.

## Functional Requirements
- `POST /api/members` must reject a request whose `email` already exists on
  another member record, mirroring the duplicate-ISBN rejection behavior in
  `POST /api/books` (AC1).
- A new `isDuplicateEmail` helper must be added to `src/validators.ts`,
  alongside the existing `isDuplicateIsbn`, following the same
  query-then-check pattern (AC2).
- A unique index on `members.email` (e.g. `idx_members_email_unique`) must be
  added to `src/db/database.ts` via the existing additive/idempotent
  migration pattern (`PRAGMA table_info` / duplicate-check guard, mirroring
  the `idx_books_isbn_unique` migration), so it does not fail if duplicate
  emails already exist in the current data (AC3).
- Existing valid (non-duplicate) member creation, and existing
  `/api/members/search` behavior, must remain unchanged (AC4).
- No new tables, no columns beyond what's needed to support the index, and
  no new endpoints are introduced — the change stays within `POST
  /api/members`, `src/validators.ts`, and `src/db/database.ts` (AC5).

## Non Functional Requirements
- Security/data-integrity: the duplicate-email check and unique index prevent
  ambiguous member records at the data layer, not just the API layer,
  consistent with how `idx_books_isbn_unique` backs up `isDuplicateIsbn` for
  books (traced from Q4 answer and the existing books pattern).
- No performance requirement beyond what the existing `isDuplicateIsbn`-style
  lookup and `parsePagination`-backed list/search endpoints already provide;
  no new performance targets were stated in the story (Q4 answer).
- No new authentication/authorization requirement is introduced — consistent
  with the rest of the members/books API surface, which has no auth checks
  today (Q4 answer, traced from existing route conventions in
  `src/routes/*.ts`).

## Acceptance Criteria
1. POST /api/members rejects a request whose email already exists on another
   member record, mirroring the duplicate-ISBN rejection behavior in POST
   /api/books.
2. A new isDuplicateEmail helper is added (in src/validators.ts, alongside
   isDuplicateIsbn), following the same pattern.
3. A unique index on members.email (e.g. idx_members_email_unique) is added
   to src/db/database.ts via the existing additive/idempotent migration
   pattern, guarded so it does not fail if duplicate emails already exist in
   the data.
4. Existing valid (non-duplicate) member creation and /api/members/search
   behavior remains unchanged.
5. No new tables, columns beyond what's needed for the index, or endpoints
   are introduced.

## Clarifications and Decisions
- Q1 (technical constraints not in the story): Yes — the implementation must
  reuse the existing `isDuplicateIsbn` pattern in `src/validators.ts` (a
  `db.prepare(...).get()` existence check, with an optional `excludeId`
  parameter for future update-path reuse) and the existing additive/idempotent
  migration pattern in `src/db/database.ts` (`PRAGMA table_info` /
  duplicate-scan guard before `CREATE UNIQUE INDEX IF NOT EXISTS`, mirroring
  `idx_books_isbn_unique`). No ORM or new dependency may be introduced; only
  `node:sqlite`'s `DatabaseSync` as used elsewhere in the codebase.
- Q2 (dependencies on other stories or systems): The duplicate-ISBN
  implementation for books (`isDuplicateIsbn`, `idx_books_isbn_unique`,
  introduced under AISDLC-29 per `src/db/database.ts` comments) is the direct
  precedent this story mirrors for members/email. No other in-flight story or
  external system dependency is identified in the Jira description.
- Q3 (definition of done): `POST /api/members` returns a 409-style rejection
  (matching the existing books 409 response shape/status for duplicate ISBN)
  when the submitted email already exists on another member; `isDuplicateEmail`
  exists in `src/validators.ts` and is used by the route; the unique index
  migration is added to `src/db/database.ts`, guarded against failing on
  existing duplicate data (consistent with the books migration's
  duplicate-scan-and-skip behavior); non-duplicate member creation and
  `/api/members/search` continue to behave exactly as before; the change is
  covered by tests following the existing `node:test` integration pattern in
  `tests/`.
- Q4 (performance or security requirements): No specific performance or
  security requirements were stated in the story beyond the data-integrity
  goal itself (preventing duplicate/ambiguous member records). The check
  should perform a single indexed lookup, consistent with the existing
  ISBN-duplicate check; no new auth/authorization requirement is introduced
  since none exists elsewhere in the members/books API today.
- Q5 (out of scope items to explicitly document): Retroactively de-duplicating
  or merging any existing duplicate-email member records already in the
  data is out of scope — the migration only guards index creation against
  failing on pre-existing duplicates (mirroring how the books migration
  handles pre-existing duplicate ISBNs), it does not clean them up. Any
  uniqueness/validation change to `POST /api/books` or other endpoints is out
  of scope. Adding authentication/authorization to any members endpoint is
  out of scope. Changing the response shape or status code conventions used
  elsewhere in the API is out of scope beyond mirroring the existing
  duplicate-ISBN rejection status.

## Out of Scope
- Retroactively de-duplicating or merging existing duplicate-email member
  records already present in the data (the migration only guards against
  failing when duplicates already exist — it does not remove them).
- Any change to `POST /api/books`, `GET /api/members/search`, or any other
  existing endpoint's behavior beyond what's needed to add the email
  duplicate check to `POST /api/members`.
- Adding authentication or authorization to any members or books endpoint.
- Introducing any new table, column beyond what supports the unique index, or
  new endpoint.
