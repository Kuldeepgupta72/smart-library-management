# Requirements — AISDLC-3: Add pagination to GET /api/members endpoint

## Story Overview
Add pagination support to the `GET /api/members` endpoint in the
Smart Library Management app, following the same pagination pattern
already implemented for `GET /api/books` (AISDLC-18). Currently
`GET /api/members` returns the full, unpaginated member list using
`SELECT *`. This story adds `page`/`pageSize` query parameters and
standardizes the underlying query to explicit columns.
- Story points, assignee, and status: as recorded in Jira for
  AISDLC-3 (backend-only scope confirmed with the human below).

## Functional Requirements
- `GET /api/members` accepts `page` and `pageSize` query parameters,
  returning a paginated slice of members instead of the full list.
- Pagination parsing/validation logic must reuse the existing
  `parsePagination` helper currently defined in `src/routes/books.ts`
  (extract it to a shared location and import it in both
  `books.ts` and `members.ts` — no duplicated pagination logic).
- The paginated response follows the same shape already used by
  `GET /api/books`: `{ members, page, pageSize, total, totalPages }`.
- The underlying SQL query for `GET /api/members` is changed from
  `SELECT *` to an explicit column list: `SELECT id, name, email`.
- `pageSize` is capped at a maximum of 100 (`MAX_PAGE_SIZE`), matching
  the existing constant/behavior used by `GET /api/books`.
- Invalid or missing `page`/`pageSize` values fall back to the same
  sane defaults used by the books endpoint (default page = 1, default
  pageSize = 20).

## Non Functional Requirements
- Performance/security requirements are identical to AISDLC-18:
  - Maximum `pageSize` cap of 100 to prevent excessive query loads.
  - No additional response-time targets beyond existing behavior.
  - No new authentication or rate-limiting requirements beyond what
    already exists in the application.

## Acceptance Criteria
- `GET /api/members` supports `page` and `pageSize` query parameters
  and returns paginated results in the same response shape as
  `GET /api/books`.
- The pagination parsing logic is shared (extracted/reused) between
  `books.ts` and `members.ts`, with no duplicate implementation.
- `GET /api/members` no longer uses `SELECT *`; it explicitly selects
  `id, name, email`.
- Automated tests are added/updated in the app repo covering the
  paginated `GET /api/members` endpoint (default pagination, explicit
  page/pageSize values, and the `pageSize` cap at 100).
- No changes are made to the frontend member list page
  (`public/index.html` / `src/client/app.ts`) as part of this story.

## Clarifications and Decisions
- Constraints: Reuse/extract the existing `parsePagination` helper
  from `books.ts` (DRY, no duplicated logic) rather than writing a
  new implementation; standardize `GET /api/members` to explicit
  `SELECT id, name, email` instead of the current `SELECT *`.
- Dependencies: None — this is a standalone story with no dependency
  on other in-flight member-related work.
- Definition of done: Backend-only. The frontend member list page
  (`public/index.html` and `src/client/app.ts`) is explicitly out of
  scope — no pagination UI controls are needed. Automated tests must
  be added/updated for the paginated `GET /api/members` endpoint as
  part of Definition of Done in this app repo.
- NFRs: Same as AISDLC-18 exactly — max `pageSize` cap of 100, no
  additional response-time targets, no auth/rate-limiting
  requirements beyond what already exists.
- Out of scope: The frontend members UI page is explicitly out of
  scope for this story (confirmed via the definition-of-done answer).

## Out of Scope
- Frontend member list page changes (`public/index.html` and
  `src/client/app.ts`) — no pagination UI controls are added as part
  of this story.
