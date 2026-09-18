import path from 'path';
import fs from 'fs';
import os from 'os';
import express, { Express } from 'express';
import type { Server } from 'http';

/**
 * Builds a throwaway Express app + isolated SQLite DB for integration
 * tests, then mounts the given compiled route modules on it.
 *
 * Uses dynamic `require()` with a runtime `__dirname`-relative path
 * (instead of a static `import`) so this helper — and every test file
 * that calls it — can be compiled by its own `tsconfig.tests.json`
 * (rootDir ".", separate from the main `src` build) while still
 * resolving the already-compiled `dist/routes/*` and `dist/db/*`
 * modules produced by `npm run build`, regardless of the two configs'
 * differing output layouts.
 *
 * IMPORTANT: `LIBRARY_DB_PATH` must be set to a fresh temp file
 * *before* this function's first call in a process, because
 * `src/db/database.ts` opens the DB connection at module-load time.
 * Node's module cache means the DB module is only ever loaded once
 * per process, so each test file (each running in its own process
 * under `node --test`) gets its own isolated on-disk SQLite file.
 */
export interface TestApp {
  app: Express;
  server: Server;
  baseUrl: string;
  close: () => Promise<void>;
  dbPath: string;
}

export function startTestApp(routeMounts: Array<{ path: string; moduleName: string }>): Promise<TestApp> {
  return new Promise((resolve, reject) => {
    try {
      const dbPath = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc3-test-db-')),
        'library.db'
      );
      process.env.LIBRARY_DB_PATH = dbPath;

      // Resolve compiled modules relative to dist/ at runtime, not at
      // type-check time — see the class-level doc comment above.
      // This helper lives at dist/tests/helpers/, so dist/ itself is
      // two levels up.
      const distRoot = path.join(__dirname, '..', '..');
      const dbModule = require(path.join(distRoot, 'db', 'database'));
      dbModule.initializeDatabase();

      const app = express();
      app.use(express.json());

      for (const mount of routeMounts) {
        const routerModule = require(path.join(distRoot, mount.moduleName));
        app.use(mount.path, routerModule.default);
      }

      const server = app.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        resolve({
          app,
          server,
          baseUrl: `http://127.0.0.1:${port}`,
          dbPath,
          close: () => new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          })
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

/** Seeds `count` members with predictable name/email values. */
export function seedMembers(count: number): void {
  const distRoot = path.join(__dirname, '..', '..');
  const db = require(path.join(distRoot, 'db', 'database')).default;
  const insert = db.prepare('INSERT INTO members (name, email) VALUES (?, ?)');
  for (let i = 1; i <= count; i++) {
    insert.run(`Member ${i}`, `member${i}@example.com`);
  }
}

/**
 * Seeds `count` books with predictable title/author/isbn values,
 * for the T7 `GET /api/books` regression check (unrelated to
 * members, but reuses the same test-app scaffolding).
 */
export function seedBooks(count: number): void {
  const distRoot = path.join(__dirname, '..', '..');
  const db = require(path.join(distRoot, 'db', 'database')).default;
  const insert = db.prepare('INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)');
  for (let i = 1; i <= count; i++) {
    insert.run(`Book ${String(i).padStart(2, '0')}`, `Author ${String(i).padStart(2, '0')}`, `ISBN-${1000 + i}`);
  }
}
