# Implementation Plan — AISDLC-2: Overdue Fine Calculation

## Phase Overview
1. **Schema & Data Model** — extend the existing `loans` table with the fine fields needed to persist fine amount and paid/waived status (no new table, per requirements).
2. **Fine Calculation** — add the flat-rate-per-day calculation logic on top of the existing `days_overdue` derivation, and wire it additively into `GET /api/loans/overdue`.
3. **Fine Lifecycle Endpoints** — add the "mark as paid" and "waive" operations (no auth check, per decision).
4. **Verification** — confirm existing overdue behavior is unchanged and the new lifecycle works end-to-end.

## Task List
| ID | Description | Complexity | Depends On |
|---|---|---|---|
| T1 | Add fine-related columns to the existing `loans` table (fine amount, paid flag, waived flag) — no new table | MEDIUM | none |
| T2 | Add flat-rate fine calculation logic (`fine = flat_rate * days_overdue`), reusing the existing `days_overdue` computation from `GET /api/loans/overdue` (`src/routes/loans.ts:21-44`) | LOW | T1 |
| T3 | Extend `GET /api/loans/overdue` to additively expose calculated fine amount and paid/waived status, leaving all existing response fields and behavior unchanged | MEDIUM | T2 |
| T4 | Add an endpoint to mark a fine as paid (status flag only, no real payment processing) | LOW | T1 |
| T5 | Add an endpoint to waive a fine (no auth/role check, per decision Q4) | LOW | T1 |
| T6 | Verify `GET /api/loans/overdue` existing fields/behavior are unchanged and fine data appears correctly for overdue loans | LOW | T3 |
| T7 | Verify end-to-end fine lifecycle: calculation → persistence → mark paid → waive | MEDIUM | T2, T4, T5 |

## Blocked Tasks
None — all tasks are sequenced by dependency above; no task is currently blocked on anything outside this plan.

## Complexity Summary
4 LOW, 3 MEDIUM, 0 HIGH. Overall story complexity: MEDIUM — one schema addition on an existing table, one additive endpoint change, and two small new lifecycle endpoints; no new tables, no auth/permission system, no payment-gateway integration (all confirmed out of scope).
