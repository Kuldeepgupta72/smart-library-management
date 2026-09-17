# Requirements — AISDLC-2: Overdue Fine Calculation

## Story Overview
- **Key:** AISDLC-2
- **Summary:** Add overdue-loan fines
- **Status:** To Do
- **Assignee:** None
- **Story points:** not set
- **Description:** Overdue detection already exists (`src/routes/loans.ts:21-44`, `GET /api/loans/overdue`), which computes a `days_overdue` value for active loans past their due date. However, there is no fine calculation, no fine persistence (no storage for fine amount/status on a loan), and no way to record, waive, or pay a fine. `README.md:131` currently states "no overdue detection or fines" as an intentional limitation, but detection is already shipped — fines are the genuinely missing half. This story covers adding fine calculation and lifecycle management on top of the existing overdue detection.

## Functional Requirements
- The system calculates an overdue fine for a loan as a flat rate charged per day overdue: `fine = flat_rate * days_overdue`.
- The fine amount is a plain numeric value with no currency symbol or unit (e.g. `0.50` per day).
- Fine data is persisted on the existing `loans` table — no new table is introduced.
- Days-overdue used in the fine calculation is derived from the existing overdue-detection logic already implemented in `GET /api/loans/overdue` (`src/routes/loans.ts:21-44`), which computes `days_overdue` via `CAST(julianday(date('now')) - julianday(l.due_date) AS INTEGER)` for active, unreturned loans past their due date.
- The system provides a way to mark a fine as paid (a status flag on the loan/fine data — no real payment processing).
- The system provides a way to waive a fine (no auth/role check required to do so).
- `GET /api/loans/overdue` is extended additively to also expose fine data (e.g. calculated fine amount and paid/waived status) — all existing response fields and behavior are unchanged.

## Non Functional Requirements
- No authentication or authorization check is required for paying or waiving a fine. This is consistent with the app's existing intentional "no authentication" limitation. A role/permission system must not be introduced for this story alone.
- No other non-functional constraints (performance, scalability) were specified by the human; not invented here.

## Acceptance Criteria
1. When a loan becomes overdue, a fine amount is calculated based on days overdue. Fine rate/currency: [pending - not specified; needs a decision, e.g. flat rate vs. per-day rate, and currency/unit].
2. The calculated fine is persisted against the loan (schema change scope: [pending - likely an addition to the existing loans table, exact columns TBD in design stage]).
3. There is a way to record that a fine has been paid.
4. There is a way to waive a fine. Waiver workflow/authorization: [pending - not specified].
5. Existing GET /api/loans/overdue behavior is unchanged; fine data is exposed additively (exact endpoint shape: [pending - design stage]).

## Clarifications and Decisions
- Constraints (Q1): Flat rate charged per day overdue (`fine = flat_rate * days_overdue`). Currency/unit is a plain numeric amount with no currency symbol (e.g. "0.50 per day"). Must fit in the existing `loans` table — no new table.
- Dependencies (Q2): Depends only on the existing overdue-detection logic (`GET /api/loans/overdue`, `src/routes/loans.ts:21-44`). No other in-flight story dependency.
- Definition of done (Q3): Full lifecycle working end-to-end — fine calculation, persistence on the loan, a way to mark a fine as paid, a way to waive a fine, and `GET /api/loans/overdue` exposes fine data additively (existing behavior unchanged).
- Auth/security (Q4): No auth check — anyone can waive a fine (consistent with the app's existing "no authentication" intentional limitation; do not add a role/permission system for this alone).
- Out of scope (Q5): No payment-gateway integration (paid = status flag only, no real payment processing). No retroactive recalculation of existing fines if the rate changes later. No dedicated member-facing fines UI — API only for this story.

## Out of Scope
- No payment-gateway integration — "paid" is a status flag only, with no real payment processing.
- No retroactive recalculation of existing fines if the flat rate changes later.
- No dedicated member-facing fines UI — this story is API-only.
