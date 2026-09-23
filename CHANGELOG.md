# Changelog

All notable changes to this project are recorded here, one entry per
completed Agentic SDLC pipeline batch.

## AISDLC-4 — Enforce email uniqueness on member creation — 2026-09-23

- **Summary:** Added `isDuplicateEmail` duplicate-email check to
  `POST /api/members`, backed by an additive/idempotent unique index
  `idx_members_email_unique` on `members.email`, mirroring the existing
  `isDuplicateIsbn`/`idx_books_isbn_unique` pattern for books. Returns
  409 on duplicate email; wrapped in try/catch (added during code
  review) to close a concurrent-insert race. No new tables, columns,
  or endpoints. Separately fixed an unrelated stale-build bug in
  `public/app.js` (PR #13) discovered while investigating test
  failures.
- **Dev PR:** #12 (implementation, merged), #13 (unrelated stale-build
  fix, merged)
- **Design Doc:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/25493505/AISDLC-4+-+Enforce+email+uniqueness+on+member+creation+-+Design)
- **Test Automation PR:** #5 (test repo, merged)
- **Test Results:** 5 passed, 0 failed, run in isolation (see `tests/evidence/test-run-AISDLC-4-20260923-133553.log`)
- **Deployment:** Confirmed reachable at http://localhost:5050
- **Batch Summary:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/25526273/AISDLC-4+-+Enforce+email+uniqueness+on+member+creation+-+Batch+Summary)

## AISDLC-3 — Add pagination to members list — 2026-09-18

- **Summary:** Added `page`/`pageSize` query parameter pagination to
  `GET /api/members`, matching the existing `GET /api/books` pattern
  (AISDLC-18). Extracted the shared `parsePagination` helper into
  `src/utils/pagination.ts` for reuse by both endpoints. Follow-up
  fixes to `src/client/app.ts` (frontend) and the test repo's
  `LoanSeeder` were required after Stage 9 test execution surfaced a
  response-shape regression and test-infrastructure gaps (see Test
  Results below).
- **Dev PR:** #3 (docs-only, merged prematurely, superseded), #4
  (implementation, merged), #5 (pipeline-log correction, merged), #6
  (JIRA_BASE_URL housekeeping, merged), #7 (frontend envelope fix,
  merged), #8 (frontend pageSize fix, merged), #9 (evidence log)
- **Design Doc:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/23822337/AISDLC-3+-+Add+pagination+to+members+list+-+Design)
- **Test Automation PR:** #2 (test repo, merged), #3 (test repo,
  LoanSeeder cleanup fix, merged), #4 (test repo, SQLite busy_timeout
  fix, merged)
- **Test Results:** 22 passed, 0 failed (see `tests/evidence/test-run-AISDLC-3-20260918-145655.log`)
- **Deployment:** Confirmed reachable at http://localhost:5050
- **Batch Summary:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/23855105/AISDLC-3+-+Add+pagination+to+members+list+-+Batch+Summary)

## AISDLC-2 — Add overdue-loan fines — 2026-09-17

- **Summary:** Added flat-rate fine calculation (`fine = flat_rate * days_overdue`)
  persisted on the existing `loans` table, pay-fine/waive-fine actions
  (no auth check), and additive extension of `GET /api/loans/overdue`
  to expose fine data with existing behavior unchanged.
- **Dev PR:** #1 (docs-only, merged early), #2 (design + code, merged)
- **Design Doc:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/23429122/AISDLC-2+-+Add+overdue-loan+fines+-+Design)
- **Test Automation PR:** #1 (test repo, open, not yet merged)
- **Test Results:** 11 passed, 0 failed (see `tests/evidence/test-run-AISDLC-2-20260917-144937.log`)
- **Deployment:** Confirmed reachable at http://localhost:5050
- **Batch Summary:** [Confluence](https://kuldeepgupta721990.atlassian.net/wiki/spaces/AISDLC/pages/23527425/AISDLC-2+-+Add+overdue-loan+fines+-+Batch+Summary)

## AISDLC-18 — Filter/sort books by availability and author — 2026-09-10

- **Epic:** AISDLC-2
- **Summary:** Added Availability filter (Available / Not available) and
  Title/Author sort to the books list, combinable with pagination, via an
  API-driven `GET /api/books` query-parameter interface with a Reset
  Filters action restoring the default Title A-Z view.
- **Dev PR:** #6 (merged)
- **Requirements PR:** #3 (merged)
- **Implementation Plan PR:** #4 (merged)
- **Design PR:** #5 (merged, self-review APPROVED)
- **Test Automation PR:** #4 (test repo, 5 happy-path Gherkin scenarios)
- **Test Results:** 5 passed, 0 failed (see `tests/evidence/test-run-AISDLC-18-20260910-152135.log`)
- **Deployment:** Confirmed reachable at http://localhost:5050
