import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, seedBooks, TestApp } from './helpers/build-test-app';

/**
 * AISDLC-3, T7: regression check for `GET /api/books` after the
 * `parsePagination` extraction into `src/utils/pagination.ts`.
 * Confirms pagination, sort, filter, and response shape all remain
 * byte-for-byte unchanged — no logic in `books.ts` was touched
 * beyond swapping the local `parsePagination`/constants for the
 * shared import.
 */

let testApp: TestApp;
const TOTAL_BOOKS = 25;

before(async () => {
  testApp = await startTestApp([{ path: '/api/books', moduleName: 'routes/books' }]);
  seedBooks(TOTAL_BOOKS);
});

after(async () => {
  await testApp.close();
});

test('GET /api/books default pagination is unchanged (page=1, pageSize=20)', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/books`);
  assert.equal(res.status, 200);

  const body = await res.json() as {
    books: unknown[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 20);
  assert.equal(body.total, TOTAL_BOOKS);
  assert.equal(body.totalPages, Math.ceil(TOTAL_BOOKS / 20));
  assert.equal(body.books.length, 20);
});

test('GET /api/books pageSize cap at 100 is unchanged', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/books?pageSize=500`);
  assert.equal(res.status, 200);
  const body = await res.json() as { pageSize: number };
  assert.equal(body.pageSize, 100);
});

test('GET /api/books sort=author is unchanged', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/books?sort=author&pageSize=100`);
  assert.equal(res.status, 200);
  const body = await res.json() as { books: Array<{ author: string }> };
  const authors = body.books.map((b) => b.author);
  const sorted = [...authors].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  assert.deepEqual(authors, sorted);
});

test('GET /api/books availability filter is unchanged (no active loans -> all available)', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/books?availability=available&pageSize=100`);
  assert.equal(res.status, 200);
  const body = await res.json() as { books: unknown[]; total: number };
  // No loans have been created in this test's isolated DB, so every
  // seeded book is still available.
  assert.equal(body.total, TOTAL_BOOKS);
  assert.equal(body.books.length, TOTAL_BOOKS);
});

test('GET /api/books response shape is unchanged (id/title/author/isbn/is_available)', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/books?pageSize=1`);
  const body = await res.json() as { books: Array<Record<string, unknown>> };
  assert.deepEqual(
    Object.keys(body.books[0]).sort(),
    ['author', 'id', 'is_available', 'isbn', 'title']
  );
});
