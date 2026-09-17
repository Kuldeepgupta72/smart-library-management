# Changelog

All notable changes to this project are recorded here, one entry per
completed Agentic SDLC pipeline batch.

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
