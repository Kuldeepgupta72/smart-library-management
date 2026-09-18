import { Router, Request, Response } from 'express';
import db from '../db/database';
import { isDuplicateIsbn } from '../validators';
import { parsePagination } from '../utils/pagination';

const router = Router();

type Availability = 'available' | 'not_available' | undefined;
type Sort = 'title' | 'author';

/**
 * Parses and validates the `availability` query param.
 * Any value other than the two accepted literals is treated as
 * "no filter applied" rather than throwing, per FR/AC validation
 * rules (never 400/500 on bad input).
 */
function parseAvailability(raw: unknown): Availability {
  try {
    return raw === 'available' || raw === 'not_available' ? raw : undefined;
  } catch (err) {
    // Defensive: should be unreachable, but never let parsing crash the request
    return undefined;
  }
}

/**
 * Parses and validates the `sort` query param.
 * Falls back to the default ('title') for any missing/invalid value.
 */
function parseSort(raw: unknown): Sort {
  try {
    return raw === 'author' ? 'author' : 'title';
  } catch (err) {
    return 'title';
  }
}

/**
 * Builds the shared SELECT + COUNT SQL for the books list, deriving
 * availability via a LEFT JOIN against `loans` (an open/active loan,
 * i.e. `returned_date IS NULL`, means the book is not available).
 * Filter and sort are combined into a single query so both conditions
 * always apply together (FR4), and availability is never read from
 * the stored `books.is_available` column here — it stays untouched
 * for `loans.ts` issue/return logic.
 */
function buildBooksQuery(availability: Availability, sort: Sort): { selectSql: string; countSql: string } {
  const whereClauses: string[] = [];
  if (availability === 'available') whereClauses.push('active_loan.book_id IS NULL');
  if (availability === 'not_available') whereClauses.push('active_loan.book_id IS NOT NULL');
  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const orderBy = sort === 'author'
    ? 'ORDER BY b.author COLLATE NOCASE ASC, b.title COLLATE NOCASE ASC'
    : 'ORDER BY b.title COLLATE NOCASE ASC';

  const fromJoin = `
    FROM books b
    LEFT JOIN loans active_loan
      ON active_loan.book_id = b.id AND active_loan.returned_date IS NULL
  `;

  const selectSql = `
    SELECT b.id, b.title, b.author, b.isbn,
           CASE WHEN active_loan.book_id IS NULL THEN 1 ELSE 0 END AS is_available
    ${fromJoin}
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS total ${fromJoin} ${where}`;

  return { selectSql, countSql };
}

router.get('/', (req: Request, res: Response) => {
  try {
    const availability = parseAvailability(req.query.availability);
    const sort = parseSort(req.query.sort);
    const { page, pageSize } = parsePagination(req.query.page, req.query.pageSize);

    const { selectSql, countSql } = buildBooksQuery(availability, sort);

    const countRow = db.prepare(countSql).get() as { total: number };
    const total = countRow.total;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;
    const books = db.prepare(selectSql).all(pageSize, offset);

    res.json({ books, page, pageSize, total, totalPages });
  } catch (err) {
    console.error('Failed to load books:', err);
    res.status(500).json({ error: 'Failed to load books' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { title, author, isbn } = req.body as { title?: string; author?: string; isbn?: string };
    if (!title || !author || !isbn) {
      res.status(400).json({ error: 'Title, author, and ISBN are required' });
      return;
    }
    if (isDuplicateIsbn(isbn)) {
      res.status(409).json({ error: 'A book with this ISBN already exists.' });
      return;
    }
    const result = db.prepare(
      'INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)'
    ).run(title, author, isbn);
    res.status(201).json({
      id: Number(result.lastInsertRowid),
      title,
      author,
      isbn,
      is_available: 1
    });
  } catch (err) {
    console.error('Failed to add book:', err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

export default router;
