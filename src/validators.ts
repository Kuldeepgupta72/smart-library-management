import db from './db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function calculateDueDate(issuedDate: string): string {
  const date = new Date(issuedDate);
  date.setDate(date.getDate() + 14);
  return date.toISOString().split('T')[0];
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
