import { Router, Request, Response } from 'express';
import db from '../db/database';
import { calculateDueDate } from '../validators';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const loans = db.prepare(`
    SELECT l.id, l.issued_date, l.due_date,
           b.id AS book_id, b.title, b.author, b.isbn,
           m.id AS member_id, m.name, m.email
    FROM loans l
    JOIN books b ON l.book_id = b.id
    JOIN members m ON l.member_id = m.id
    WHERE l.returned_date IS NULL
    ORDER BY l.id ASC
  `).all();
  res.json(loans);
});

// GET /api/loans/overdue — read-only list of loans that are still
// active (not returned) and past their due date. Reuses the same
// books/members join pattern as GET '/', adding an overdue filter
// and a computed days_overdue field (AISDLC-7).
router.get('/overdue', (_req: Request, res: Response) => {
  try {
    const overdueLoans = db.prepare(`
      SELECT l.id, l.issued_date, l.due_date,
             b.id AS book_id, b.title, b.isbn,
             m.id AS member_id, m.name, m.email,
             CAST(julianday(date('now')) - julianday(l.due_date) AS INTEGER) AS days_overdue
      FROM loans l
      JOIN books b ON l.book_id = b.id
      JOIN members m ON l.member_id = m.id
      WHERE l.returned_date IS NULL
        AND l.due_date < date('now')
      ORDER BY l.due_date ASC
    `).all();
    res.json(overdueLoans);
  } catch (err) {
    console.error('Failed to fetch overdue loans:', err);
    res.status(500).json({ error: 'Failed to fetch overdue loans' });
  }
});

router.post('/issue', (req: Request, res: Response) => {
  const { book_id, member_id } = req.body as { book_id?: number; member_id?: number };
  if (!book_id || !member_id) {
    res.status(400).json({ error: 'book_id and member_id are required' });
    return;
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id) as
    | { id: number; is_available: number }
    | undefined;
  if (!book) {
    res.status(404).json({ error: 'Book not found' });
    return;
  }
  if (!book.is_available) {
    res.status(400).json({ error: 'Book is not available' });
    return;
  }

  const issuedDate = new Date().toISOString().split('T')[0];
  const dueDate = calculateDueDate(issuedDate);
  db.prepare('INSERT INTO loans (book_id, member_id, issued_date, due_date) VALUES (?, ?, ?, ?)').run(
    book_id,
    member_id,
    issuedDate,
    dueDate
  );
  db.prepare('UPDATE books SET is_available = 0 WHERE id = ?').run(book_id);

  res.status(201).json({ message: 'Book issued successfully', due_date: dueDate });
});

router.post('/return', (req: Request, res: Response) => {
  const { loan_id } = req.body as { loan_id?: number };
  if (!loan_id) {
    res.status(400).json({ error: 'loan_id is required' });
    return;
  }

  const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND returned_date IS NULL').get(
    loan_id
  ) as { id: number; book_id: number } | undefined;
  if (!loan) {
    res.status(404).json({ error: 'Active loan not found' });
    return;
  }

  const returnedDate = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE loans SET returned_date = ? WHERE id = ?').run(returnedDate, loan_id);
  db.prepare('UPDATE books SET is_available = 1 WHERE id = ?').run(loan.book_id);

  res.status(200).json({ message: 'Book returned successfully' });
});

export default router;
