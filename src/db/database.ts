import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.LIBRARY_DB_PATH
  || path.join(process.cwd(), 'data', 'library.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT NOT NULL,
      is_available INTEGER DEFAULT 1
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      issued_date TEXT NOT NULL,
      returned_date TEXT,
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    )
  `);

  // AISDLC-5: add due_date column if not present
  const loanColumns = db.prepare('PRAGMA table_info(loans)').all() as Array<{ name: string }>;
  if (!loanColumns.some(col => col.name === 'due_date')) {
    db.exec('ALTER TABLE loans ADD COLUMN due_date TEXT');
  }

  // AISDLC-29: add unique index on books.isbn (skip if duplicates exist)
  const duplicates = db.prepare(
    'SELECT isbn FROM books GROUP BY isbn HAVING COUNT(*) > 1'
  ).all();
  if (duplicates.length > 0) {
    console.warn('AISDLC-29: Duplicate ISBNs found — skipping unique index creation:', duplicates);
  } else {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_books_isbn_unique ON books(isbn)');
  }
}

export default db;
