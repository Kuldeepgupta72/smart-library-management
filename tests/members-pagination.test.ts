import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestApp, seedMembers, TestApp } from './helpers/build-test-app';

/**
 * AISDLC-3, T6: automated tests for `GET /api/members` pagination.
 * Covers: default pagination, explicit page/pageSize, and the
 * pageSize cap at 100 — per the approved design/impl-plan.
 */

let testApp: TestApp;
const TOTAL_MEMBERS = 25;

before(async () => {
  testApp = await startTestApp([{ path: '/api/members', moduleName: 'routes/members' }]);
  seedMembers(TOTAL_MEMBERS);
});

after(async () => {
  await testApp.close();
});

test('GET /api/members with no query params falls back to default pagination', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/members`);
  assert.equal(res.status, 200);

  const body = await res.json() as {
    members: unknown[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  assert.equal(body.page, 1);
  assert.equal(body.pageSize, 20);
  assert.equal(body.total, TOTAL_MEMBERS);
  assert.equal(body.totalPages, Math.ceil(TOTAL_MEMBERS / 20));
  assert.equal(body.members.length, 20);
});

test('GET /api/members with explicit page/pageSize returns the correct slice', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/members?page=2&pageSize=5`);
  assert.equal(res.status, 200);

  const body = await res.json() as {
    members: Array<{ id: number; name: string; email: string }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  assert.equal(body.page, 2);
  assert.equal(body.pageSize, 5);
  assert.equal(body.total, TOTAL_MEMBERS);
  assert.equal(body.totalPages, Math.ceil(TOTAL_MEMBERS / 5));
  assert.equal(body.members.length, 5);
  // Page 2 with pageSize 5 -> offset 5 -> first row is member id 6
  // (members were seeded/ordered by ascending id).
  assert.equal(body.members[0].id, 6);
  assert.deepEqual(Object.keys(body.members[0]).sort(), ['email', 'id', 'name']);
});

test('GET /api/members clamps pageSize at MAX_PAGE_SIZE (100)', async () => {
  const res = await fetch(`${testApp.baseUrl}/api/members?pageSize=500`);
  assert.equal(res.status, 200);

  const body = await res.json() as {
    members: unknown[];
    page: number;
    pageSize: number;
    total: number;
  };

  assert.equal(body.pageSize, 100);
  assert.equal(body.page, 1);
  // Only 25 members exist, so the clamped page of 100 still returns
  // all of them rather than erroring or padding.
  assert.equal(body.members.length, TOTAL_MEMBERS);
});

test('GET /api/members/search and POST /api/members are unaffected by the pagination change', async () => {
  const searchRes = await fetch(`${testApp.baseUrl}/api/members/search?q=Member 1`);
  assert.equal(searchRes.status, 200);
  const searchBody = await searchRes.json();
  assert.ok(Array.isArray(searchBody), 'GET /search must still return a flat array, not a paginated envelope');

  const postRes = await fetch(`${testApp.baseUrl}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'New Member', email: 'new-member@example.com' })
  });
  assert.equal(postRes.status, 201);
});
