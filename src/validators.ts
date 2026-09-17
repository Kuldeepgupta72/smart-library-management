import db from './db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function calculateDueDate(issuedDate: string): string {
  const date = new Date(issuedDate);
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
}

// AISDLC-2: flat per-day overdue fine rate. Plain numeric value, no
// currency unit — not a secret or deployment-specific config, so it
// is a module-level constant rather than an env var (per approved
// requirements).
export const FLAT_RATE_PER_DAY = 0.5;

// AISDLC-2: fine = flat rate * days overdue. daysOverdue is always
// derived server-side (never client input), so no input validation
// beyond guarding against non-positive values here.
export function calculateFine(daysOverdue: number): number {
  if (typeof daysOverdue !== 'number' || Number.isNaN(daysOverdue) || daysOverdue <= 0) {
    return 0;
  }
  return FLAT_RATE_PER_DAY * daysOverdue;
}

export function isDuplicateIsbn(isbn: string, excludeId?: number): boolean {
  if (excludeId !== undefined) {
    const row = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(isbn, excludeId);
    return row !== undefined;
  }
  const row = db.prepare('SELECT id FROM books WHERE isbn = ?').get(isbn);
  return row !== undefined;
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
