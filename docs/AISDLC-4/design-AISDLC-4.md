# Design — AISDLC-4: Enforce email uniqueness on member creation

## Architecture Document

No new services, processes, or dependencies. This story adds one
validator function, one additive schema migration, and one guard
clause inside the existing single Express server (port 5050), fully
mirroring the existing `isDuplicateIsbn` / `idx_books_isbn_unique` /
`POST /api/books` precedent for `books.isbn`.

```
┌─────────────────────────────┐
│  public/index.html + app.ts │  (unchanged — existing
│  (Add Member form)          │   generic err.error handler
└──────────────┬───────────────┘   already surfaces new message)
               │ POST /api/members { name, email }
               ▼
┌───────────────────────────────────────┐
│  src/routes/members.ts                 │
│  router.post('/')                      │
│  1. require name + email       (existing)
│  2. isValidEmail(email)        (existing)
│  3. isDuplicateEmail(email)    <-- NEW guard, inserted here
│  4. INSERT INTO members        (existing, unchanged)
└──────────────┬──────────────────────────┘
               │ calls
               ▼
┌───────────────────────────────────────┐
│  src/validators.ts                     │
│  isDuplicateEmail(email, excludeId?)   <-- NEW, mirrors
│    db.prepare('SELECT id FROM members  │    isDuplicateIsbn
│      WHERE email = ? [AND id != ?]')   │
│      .get(...)                         │
└──────────────┬──────────────────────────┘
               │ reads
               ▼
┌───────────────────────────────────────┐
│  src/db/database.ts                     │
│  initializeDatabase()                   │
│  existing: idx_books_isbn_unique        │
│  NEW: scan members GROUP BY email       │
│    HAVING COUNT(*) > 1 -> warn+skip     │
│    else CREATE UNIQUE INDEX IF NOT      │
│    EXISTS idx_members_email_unique      │
│    ON members(email)                    │
└───────────────────────────────────────┘
```

### New/changed components and responsibilities
- **`isDuplicateEmail` (`src/validators.ts`, new function)** —
  single responsibility: given an email (and optional `excludeId`
  for future update-path reuse), returns whether another `members`
  row already has that email. Pure query-then-check, no side
  effects, identical shape to `isDuplicateIsbn`.
- **`idx_members_email_unique` migration (`src/db/database.ts`,
  new block inside `initializeDatabase()`)** — responsible for
  making uniqueness durable at the data layer, not just the API
  layer. Guarded exactly like `idx_books_isbn_unique`: scans for
  existing duplicates first, warns and skips index creation if any
  exist (never fails startup, never deletes/merges data), otherwise
  creates the unique index. Idempotent (`IF NOT EXISTS`), safe to
  run on every startup.
- **`POST /api/members` handler (`src/routes/members.ts`,
  changed)** — one new guard clause added after the existing
  `isValidEmail` check and before the `INSERT`: calls
  `isDuplicateEmail(email)` and, if true, returns `409` with an
  error message, mirroring `POST /api/books`'s duplicate-ISBN
  rejection. All other logic (required-field check, email-format
  check, insert, response shape, `GET /api/members`, `GET
  /api/members/search`) is untouched.

## HLD (High-Level Design)

- **Table affected**: `members` only — no new table, no new column
  (AC5). The only schema change is a unique index on the existing
  `email` column.
- **Endpoint affected**: `POST /api/members` only. `GET
  /api/members`, `GET /api/members/search`, and all `books`/`loans`
  endpoints are unchanged (AC4, out of scope per requirements).
- **UI screens affected**: none. The frontend has one relevant
  screen — the "Add Member" form (`public/index.html`, wired in
  `src/client/app.ts`'s `initForms()`, `add-member-form` handler,
  lines 439-460). That handler already renders whatever `error`
  string comes back from any non-2xx `POST /api/members` response
  into `#member-error` (`memberError.textContent = err.error || '...'`).
  No frontend code change is needed: the new 409 response's error
  message will surface automatically through this existing generic
  path. This is a backend validation change with a zero-diff,
  already-compatible frontend.

## LLD (Low-Level Design)

### Schema change (exact SQL)
Added inside `initializeDatabase()` in `src/db/database.ts`, after
the existing `idx_books_isbn_unique` block:

```sql
-- AISDLC-4: add unique index on members.email (skip if duplicates exist)
SELECT email FROM members GROUP BY email HAVING COUNT(*) > 1;
-- if the above returns 0 rows:
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique ON members(email);
```

Implementation mirrors the books block verbatim in structure:

```typescript
// AISDLC-4: add unique index on members.email (skip if duplicates exist)
const duplicateEmails = db.prepare(
  'SELECT email FROM members GROUP BY email HAVING COUNT(*) > 1'
).all();
if (duplicateEmails.length > 0) {
  console.warn('AISDLC-4: Duplicate emails found — skipping unique index creation:', duplicateEmails);
} else {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_email_unique ON members(email)');
}
```

No `CREATE TABLE`/`ALTER TABLE` column change is needed — `email`
already exists as `TEXT NOT NULL`; only an index is added.

### API signature — `isDuplicateEmail` (`src/validators.ts`)

```typescript
export function isDuplicateEmail(email: string, excludeId?: number): boolean {
  if (excludeId !== undefined) {
    const row = db.prepare('SELECT id FROM members WHERE email = ? AND id != ?').get(email, excludeId);
    return row !== undefined;
  }
  const row = db.prepare('SELECT id FROM members WHERE email = ?').get(email);
  return row !== undefined;
}
```

Exact structural mirror of `isDuplicateIsbn` (`src/validators.ts:27`),
substituting `members`/`email` for `books`/`isbn`. `excludeId` is
unused by this story's route (`POST /api/members` has no update
path) but included per Q1's clarification, for future reuse.

### Validation logic sequencing (`src/routes/members.ts`, `POST /`)

Order matters — each check short-circuits the request before the
next:

1. `if (!name || !email)` → `400 { error: 'Name and email are required' }` (existing, unchanged)
2. `if (!isValidEmail(email))` → `400 { error: 'Invalid email format.' }` (existing, unchanged)
3. **NEW**: `if (isDuplicateEmail(email))` → `409 { error: 'A member with this email already exists.' }`
4. `INSERT INTO members (name, email) VALUES (?, ?)` (existing, unchanged) → `201`

Rationale for placing the duplicate check after format validation:
mirrors `POST /api/books`'s ordering (required-fields → duplicate
check → insert) as closely as possible while preserving this route's
existing required-fields → format check ordering; a malformed email
should fail on format (400) before an expensive/irrelevant duplicate
lookup, consistent with fail-fast validation and Q1's "reuse existing
patterns" instruction.

Response status/shape for the new case mirrors the books precedent
exactly (`src/routes/books.ts:105-108`, `409` + `{ error: string }`).

## Wireframes

No wireframe is added or changed. Per the requirements doc's Out of
Scope section and this story's AC4/AC5, no UI screens are affected.
The existing "Add Member" form and its error-banner (`#member-error`)
in `public/index.html` / `src/client/app.ts` already handle arbitrary
`error` strings from any non-2xx `POST /api/members` response
generically (see HLD above) — no new screen, no new error-display
element, and no markup change is introduced by this story.

## Self-Review Findings

| Severity | Finding | Recommendation |
|---|---|---|
| LOW | Pre-existing duplicate emails in current data will silently skip index creation forever (mirrors the accepted books precedent) — there is no follow-up mechanism to notify an operator beyond a `console.warn` at startup. | Out of scope for this story per Q5, but consider a future story to surface this warning more visibly (e.g. an admin-facing `/api/health` or startup-report endpoint) if it recurs across future unique-index migrations. |
| LOW | `isDuplicateEmail`'s email comparison is case-sensitive (SQLite `TEXT` default collation), so `Jane@x.com` and `jane@x.com` would both pass as "unique" today, matching `isDuplicateIsbn`'s same case-sensitive behavior for ISBNs. | Not a regression and consistent with existing precedent; flagged only for awareness. If case-insensitive uniqueness is desired, that would need `COLLATE NOCASE` on both the index and the query — explicitly out of scope unless the human requests it, since AC2 requires mirroring the existing pattern exactly. |
| LOW | No test currently exercises the migration's skip-and-warn path against a real pre-seeded-duplicate database at server startup (only unit-level coverage of `isDuplicateEmail` and the route's 409 behavior is explicitly planned in impl-plan T4d). | Impl plan T4(d) already covers this ("migration does not throw when pre-existing duplicate emails are present in a fresh test DB seeded with duplicates") — no design change needed, just confirming test coverage traces through to LLD before sign-off. |

No HIGH or MEDIUM findings: the change is fully contained to
`members`/`POST /api/members`/`src/validators.ts`/`src/db/database.ts`,
introduces no new tables, columns, endpoints, or dependencies (AC5),
requires no frontend change, and follows an already-proven, in-repo
precedent (`isDuplicateIsbn` / `idx_books_isbn_unique`) exactly.

## Overall Decision

APPROVED — the design stays entirely within the existing schema and
stack, mirrors an established in-repo pattern precisely, requires no
new dependencies or UI changes, and all self-review findings are LOW
severity and non-blocking.
