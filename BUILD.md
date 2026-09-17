# Build & Deploy

## Prerequisites

- Node.js and npm installed (no other tools required — scripts are plain Node.js)

## Database persistence

Both dev and deployed modes share the same database file at `data/library.db` (repo root).

- `npm run dev` / `npm start` — uses `data/library.db` by default (via `process.cwd()/data/library.db`)
- `npm run deploy:local` — explicitly sets `LIBRARY_DB_PATH=<repo-root>/data/library.db` when starting the server

**Redeploying does not reset data.** Books, members, and loans added in dev or through a previous deployment remain visible after running `npm run deploy:local` again. The `deploy/` folder is ephemeral (cleaned each run); the database lives outside it.

To use a different database location, set the `LIBRARY_DB_PATH` environment variable before starting the server:
```sh
LIBRARY_DB_PATH=/path/to/custom.db npm start
```

The `data/` folder is gitignored.

## Building the app

```sh
npm run build:artifact
```

Runs `build.js`. What it does:
1. Cleans `dist/` and any previous `.zip` artifacts in `artifacts/`
2. Runs `npm install`
3. Compiles TypeScript (`npm run build`) — outputs to `dist/`
4. Verifies `dist/server.js` was produced (exits with an error if not)
5. Packages `dist/`, `public/`, `package.json`, and `package-lock.json` into a versioned zip

Output: `artifacts/smart-library-management-build-<timestamp>.zip`

The `artifacts/` folder is gitignored (build outputs, not source).

## Deploying locally

```sh
npm run deploy:local
```

Runs `deploy-local.js`. What it does:
1. Picks the most-recent zip from `artifacts/`
2. Cleans and recreates `deploy/`
3. Extracts the zip into `deploy/`
4. Runs `npm install --omit=dev` inside `deploy/` (installs only runtime dependencies)
5. Starts the server: `node dist/server.js` from within `deploy/`

Once started, the app is available at **http://localhost:5050**.

Stop the server with `Ctrl+C`.

The `deploy/` folder is gitignored (deployment target, not source).

## Artifact contents

```
smart-library-management-build-<timestamp>.zip
├── dist/           # compiled JavaScript (server + client bundles)
├── public/         # static frontend files served at runtime
├── package.json    # npm manifest (needed for production install)
└── package-lock.json
```

> `public/` is included because the server resolves it relative to `dist/` at runtime:
> `path.join(__dirname, '..', 'public')` → one level above `dist/server.js`.
