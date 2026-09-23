import { Router, Request, Response } from 'express';
import db from '../db/database';
import { isValidEmail, isDuplicateEmail } from '../validators';
import { parsePagination } from '../utils/pagination';

const router = Router();

router.get('/search', (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }
  const members = db.prepare(
    'SELECT id, name, email FROM members WHERE name LIKE ? OR email LIKE ? ORDER BY id ASC'
  ).all(`%${q}%`, `%${q}%`);
  res.json(members);
});

router.get('/', (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query.page, req.query.pageSize);

    // NOTE: unlike books.ts's count query (which mirrors its WHERE
    // clause), this COUNT(*) is intentionally unfiltered because
    // GET /api/members has no filter query params today. If a filter
    // is ever added here, this count query MUST be updated to apply
    // the same WHERE clause as the SELECT below, or total/totalPages
    // will silently drift out of sync with the returned page of rows
    // (see design-AISDLC-3.md Self-Review Findings).
    const countRow = db.prepare('SELECT COUNT(*) AS total FROM members').get() as { total: number };
    const total = countRow.total;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    const offset = (page - 1) * pageSize;
    const members = db.prepare(
      'SELECT id, name, email FROM members ORDER BY id ASC LIMIT ? OFFSET ?'
    ).all(pageSize, offset);

    res.json({ members, page, pageSize, total, totalPages });
  } catch (err) {
    console.error('Failed to load members:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

router.post('/', (req: Request, res: Response) => {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Invalid email format.' });
    return;
  }
  // AISDLC-4: reject duplicate emails, mirroring POST /api/books'
  // duplicate-ISBN rejection (409 + same response shape).
  if (isDuplicateEmail(email)) {
    res.status(409).json({ error: 'A member with this email already exists.' });
    return;
  }
  const result = db.prepare(
    'INSERT INTO members (name, email) VALUES (?, ?)'
  ).run(name, email);
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    name,
    email
  });
});

export default router;
