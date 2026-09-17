# Design — AISDLC-2: Add overdue-loan fines

## Architecture Document

### Technology approach
No new dependencies. Story is implemented entirely within the existing stack: Node.js + Express + TypeScript, SQLite (via the existing `db.prepare(...)` pattern in `src/db/database.ts`), served on port 5050. Fine data lives on the existing `loans` table (per approved requirements — no new table). Migration follows the same additive `PRAGMA table_info` / `ALTER TABLE ... ADD COLUMN` pattern already used for `due_date` (AISDLC-5) and the `books.isbn` unique index (AISDLC-29) in `src/db/database.ts`.

### New/changed components and responsibilities
- **`src/db/database.ts`** (changed) — extend the existing migration block with three additive `ALTER TABLE loans ADD COLUMN` statements (fine amount, paid flag, waived flag), guarded by `PRAGMA table_info` checks so the migration is idempotent, matching the existing style.
- **`src/validators.ts`** (changed) — add a pure function `calculateFine(daysOverdue: number): number` implementing `fine = FLAT_RATE_PER_DAY * daysOverdue`, alongside the existing `calculateDueDate`. `FLAT_RATE_PER_DAY` is a module-level constant (not a secret, not deployment-specific per the approved requirements).
- **`src/routes/loans.ts`** (changed), all additive:
  1. `GET /api/loans/overdue` — for each overdue row, compute/persist the fine amount (if not already set) and additively include fine fields in the JSON response. Existing fields/behavior unchanged.
  2. `POST /api/loans/:id/pay-fine` (new) — marks a loan's fine as paid.
  3. `POST /api/loans/:id/waive-fine` (new) — marks a loan's fine as waived. No auth/role check, per approved requirement Q4.
- No UI component changes — API-only per approved out-of-scope.

### Architecture diagram
```
Client / API consumer
        |
        v
+------------------------------+
| Express Router: loans.ts     |
|                               |
|  GET  /api/loans/overdue -----> reads/updates loans (fine cols)
|  POST /api/loans/:id/pay-fine -> updates loans.fine_paid
|  POST /api/loans/:id/waive-fine> updates loans.fine_waived
+---------------+---------------+
                |
                v
    +--------------------------+
    | validators.ts            |
    | calculateFine(daysOverdue)|
    +--------------------------+
                |
                v
    +--------------------------+
    | SQLite: loans table       |
    | (+ fine_amount,           |
    |    fine_paid,             |
    |    fine_waived)           |
    +--------------------------+
                ^
                |
         books, members
        (joined, unchanged)
```

## HLD (High-Level Design)

### Tables affected
- `loans` (existing table, extended) — three new columns: fine amount, paid flag, waived flag. `books` and `members` unchanged.

### Endpoints affected
- `GET /api/loans/overdue` (existing, AISDLC-7) — extended additively. Existing fields (`id`, `issued_date`, `due_date`, book/member fields, `days_overdue`) unchanged. New fields: `fine_amount`, `fine_paid`, `fine_waived`.
- `POST /api/loans/:id/pay-fine` (new) — marks a loan's fine as paid (status flag only, no real payment processing).
- `POST /api/loans/:id/waive-fine` (new) — marks a loan's fine as waived, no auth check (per approved decision Q4).

### UI screens affected
None — API-only per approved requirements' Out of Scope section.

## LLD (Low-Level Design)

### Schema changes (loans table, additive, idempotent migration)
```sql
-- Guarded by PRAGMA table_info(loans) checks, one ALTER per column,
-- matching the existing AISDLC-5 due_date migration style.
ALTER TABLE loans ADD COLUMN fine_amount REAL;              -- nullable; NULL = not yet calculated
ALTER TABLE loans ADD COLUMN fine_paid INTEGER DEFAULT 0;   -- 0/1 boolean flag
ALTER TABLE loans ADD COLUMN fine_waived INTEGER DEFAULT 0; -- 0/1 boolean flag
```
- `fine_amount REAL`: plain numeric value, no currency symbol/unit. `NULL` until the loan is first seen as overdue; then persisted (not recalculated on later reads) — see Self-Review MEDIUM finding below.
- `fine_paid INTEGER DEFAULT 0`: 0 = unpaid, 1 = paid (status flag only).
- `fine_waived INTEGER DEFAULT 0`: 0 = not waived, 1 = waived.

### Fine calculation logic (`src/validators.ts`)
```typescript
export const FLAT_RATE_PER_DAY = 0.50; // plain numeric, no currency unit

export function calculateFine(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  return FLAT_RATE_PER_DAY * daysOverdue;
}
```
- Validation: `daysOverdue` is always derived server-side from the existing SQL in `GET /api/loans/overdue` (`src/routes/loans.ts:21-44`) — never client input, so no request-body validation needed for this value.

### API signatures

**`GET /api/loans/overdue`** (extended, no query-param change) — response item adds:
```json
{
  "...existing fields unchanged...": "...",
  "days_overdue": 5,
  "fine_amount": 2.50,
  "fine_paid": false,
  "fine_waived": false
}
```
Server logic: if `fine_amount IS NULL`, compute `calculateFine(days_overdue)`, persist via `UPDATE loans SET fine_amount = ? WHERE id = ?`, include in response; if already set, reuse as-is.

**`POST /api/loans/:id/pay-fine`** (new)
- Path param: `id` (integer, required).
- Validation: loan must exist (`404`); must have `fine_amount IS NOT NULL` (`400`); must not already be waived (`400`).
- Success: `UPDATE loans SET fine_paid = 1 WHERE id = ?` → `200 { message: "Fine marked as paid" }`.

**`POST /api/loans/:id/waive-fine`** (new)
- Path param: `id` (integer, required). No auth/role check (per Q4).
- Validation: loan must exist (`404`); must have a calculated fine (`400`); must not already be paid (`400`).
- Success: `UPDATE loans SET fine_waived = 1 WHERE id = ?` → `200 { message: "Fine waived" }`.

## Wireframes
None — API-only story, per approved Out of Scope. No screen invented.

## Self-Review Findings
| Severity | Finding | Recommendation |
|---|---|---|
| MEDIUM | `waive-fine`/`pay-fine` have no auth check — any client can waive/fake-pay any fine. | Accepted per approved Q4 (explicit human decision) — flagged for visibility, not a blocker. |
| MEDIUM | `fine_amount` is only ever calculated the first time `GET /api/loans/overdue` sees a loan; a loan returned late without that endpoint ever being called first never gets a fine recorded. | Out of scope for this story (fine calc tied to existing `/overdue` read path) — flag as a known gap for a future story. |
| LOW | `fine_paid`/`fine_waived` are two independent booleans rather than one enum; validation guards prevent both being 1 today, but a future bug could violate that. | Consider a single `fine_status` enum column in a future refactor; not required now. |
| LOW | No new index added. | Not needed — all new-endpoint lookups are by primary key `id`. |
| LOW | `FLAT_RATE_PER_DAY` hardcoded, not env-configurable. | Acceptable per approved requirements (single flat rate specified); revisit only if a future story needs configurable rates. |

## Overall Decision
APPROVED — design stays within the existing `books`/`members`/`loans` schema (only `loans` extended, additively), introduces no new dependencies, reuses the existing overdue-detection query, and keeps `GET /api/loans/overdue`'s existing fields/behavior unchanged. All findings are MEDIUM/LOW, non-blocking, and either already covered by an explicit human decision (Q4) or flagged as future-story gaps rather than defects in this design.
