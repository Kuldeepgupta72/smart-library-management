import express from 'express';
import path from 'path';
import { initializeDatabase } from './db/database';
import booksRouter from './routes/books';
import membersRouter from './routes/members';
import loansRouter from './routes/loans';

const app = express();
const PORT = 5050;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

initializeDatabase();

app.use('/api/books', booksRouter);
app.use('/api/members', membersRouter);
app.use('/api/loans', loansRouter);

app.listen(PORT, () => {
  console.log(`Smart Library Management System running at http://localhost:${PORT}`);
});
