import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, TestApp } from './helpers/build-test-app';

/**
 * AISDLC-4, T4: automated tests for POST /api/members email
 * uniqueness enforcement, per the approved design/impl-plan.
 * Covers: (a) duplicate email rejection, (b) non-duplicate creation
 * still succeeding, (c) GET /api/members/search remaining
 * unaffected, and (d) the idx_members_email_unique migration not
 * throwing when pre-existing duplicate emails are present.
 */

let testApp: TestApp;

before(async () => {
  testApp = await startTestApp([{ path: '/api/members', moduleName: 'routes/members' }]);
});

after(async () => {
  await testApp.close();
});

test('POST /api/members rejects a duplicate email with 409', async () => {
  const first = await fetch(`${testApp.baseUrl}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Jane Doe', email: 'jane.dup@example.com' })
  });
  assert.equal(first.status, 201);

  const second = await fetch(`${testApp.baseUrl}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Jane Doe Impersonator', email: 'jane.dup@example.com' })
  });
  assert.equal(second.status, 409);
  const body = await second.json() as { error: string };
  assert.equal(body.error, 'A member with this email already exists.');
});

test('POST /api/members with a non-duplicate email still succeeds unchanged', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unique Member', email: 'unique-member@example.com' })
  });
  assert.equal(res.status, 201);
  const body = await res.json() as { id: number; name: string; email: string };
  assert.equal(body.name, 'Unique Member');
  assert.equal(body.email, 'unique-member@example.com');
  assert.equal(typeof body.id, 'number');
});

test('GET /api/members/search remains unaffected by the email-uniqueness change', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/members/search?q=Unique Member`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body), 'GET /search must still return a flat array, not a paginated envelope');
  assert.ok(body.some((m: { email: string }) => m.email === 'unique-member@example.com'));
});

test('idx_members_email_unique migration does not throw when pre-existing duplicate emails exist', () => {
  // Insert duplicate emails directly (bypassing the API's own guard)
  // to simulate a pre-existing-duplicate database, then re-run the
  // additive/idempotent migration to confirm it warns and skips
  // index creation instead of throwing, mirroring the books
  // duplicate-ISBN migration's guard behavior.
  const distRoot = require('path').join(__dirname, '..');
  const dbModule = require(distRoot + '/db/database');
  const db = dbModule.default;

  // The earlier `before()` hook's initializeDatabase() call already
  // created idx_members_email_unique (table was empty/duplicate-free
  // at that time), so it must be dropped first here to simulate a
  // database that reaches this migration with pre-existing duplicate
  // emails already present — otherwise the INSERTs below would fail
  // on the unique constraint before the migration guard is even
  // exercised.
  db.exec('DROP INDEX IF EXISTS idx_members_email_unique');
  db.prepare('INSERT INTO members (name, email) VALUES (?, ?)').run('Dup One', 'seeded-dup@example.com');
  db.prepare('INSERT INTO members (name, email) VALUES (?, ?)').run('Dup Two', 'seeded-dup@example.com');

  assert.doesNotThrow(() => dbModule.initializeDatabase());

  // Confirm the guard actually skipped recreation rather than the
  // index having been silently rebuilt some other way.
  const indexRow = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_members_email_unique'"
  ).get();
  assert.equal(indexRow, undefined, 'index must remain absent while duplicate emails exist');
});
