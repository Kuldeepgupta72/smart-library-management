# Smart Library Management System

A lightweight library management system for tracking books, members, and loans — built with a Node.js/Express backend, SQLite storage, and a plain HTML/CSS/TypeScript frontend (no framework, no bundler).

## Tech Stack

- **Backend:** Node.js + Express (TypeScript)
- **Database:** SQLite via the built-in `node:sqlite` module (requires Node.js >= 22.5)
- **Frontend:** Plain HTML + CSS + vanilla TypeScript, compiled to plain JS (no framework, no bundler)
- **Port:** 5050

## Architecture

The app is a single Express server that serves a static frontend and a JSON REST API, backed by a single SQLite database file.

```
┌─────────────────────────┐
│  Browser (public/)      │
│  index.html + style.css │
│  app.js (compiled from  │
│  src/client/app.ts)     │
└───────────┬──────────────┘
            │ fetch() → /api/*
            ▼
┌─────────────────────────┐
│  Express server          │
│  src/server.ts            │
│  ├─ /api/books   (routes/books.ts)   │
│  ├─ /api/members (routes/members.ts) │
│  └─ /api/loans   (routes/loans.ts)   │
│  Shared validation: src/validators.ts │
└───────────┬──────────────┘
            │ node:sqlite (DatabaseSync)
            ▼
┌─────────────────────────┐
│  SQLite database          │
│  data/library.db           │
│  tables: books, members, loans │
└─────────────────────────┘
```

TypeScript source in `src/` is compiled by `tsc` into plain JavaScript: the backend compiles to `dist/`, and the frontend client compiles to `public/app.js` (served statically alongside `public/index.html` and `public/style.css`).

## Database Schema

- **books** — `id`, `title`, `author`, `isbn` (unique), `is_available`
- **members** — `id`, `name`, `email`
- **loans** — `id`, `book_id` (FK → books), `member_id` (FK → members), `issued_date`, `due_date`, `returned_date` (null while active)

The database file lives at `data/library.db` by default (override with the `LIBRARY_DB_PATH` env var). Schema is created and migrated automatically on server start (see `src/db/database.ts`).

## API Endpoints

| Method | Endpoint             | Description                                      |
|--------|----------------------|---------------------------------------------------|
| GET    | `/api/books`         | List all books                                    |
| POST   | `/api/books`         | Add a book (`title`, `author`, `isbn`); rejects duplicate ISBNs |
| GET    | `/api/members`       | List all members                                  |
| GET    | `/api/members/search`| Search members by name or email (`?q=`)           |
| POST   | `/api/members`       | Add a member (`name`, `email`); validates email format |
| GET    | `/api/loans`         | List all active (unreturned) loans                |
| POST   | `/api/loans/issue`   | Issue a book (`book_id`, `member_id`); sets a 14-day due date |
| POST   | `/api/loans/return`  | Return a book (`loan_id`)                         |

## Features

1. **Books** — Add books (title, author, ISBN) and view the full catalogue with availability status; duplicate ISBNs are rejected
2. **Members** — Add library members (name, email) and view the member list; search members by name or email
3. **Issue Book** — Select an available book and a member to issue the book; a due date is set automatically (14 days out)
4. **Return Book** — View all active loans and return a book with one click

## Getting Started

```bash
npm install
npm run build
npm start
```

Then open [http://localhost:5050](http://localhost:5050) in your browser.

### Available scripts

| Script                  | Description                                              |
|--------------------------|-----------------------------------------------------------|
| `npm run build`          | Compiles backend (`tsconfig.json`) and frontend (`tsconfig.client.json`) TypeScript |
| `npm start`              | Runs the compiled server (`dist/server.js`)               |
| `npm run dev`            | Build then start, in one step                             |
| `npm run build:artifact` | Packages a deployable zip into `artifacts/` (see [BUILD.md](BUILD.md)) |
| `npm run deploy:local`   | Extracts the latest artifact into `deploy/` and runs it locally (see [BUILD.md](BUILD.md)) |

## Project Structure

```
├── src/                       # TypeScript source (compiled, not run directly)
│   ├── server.ts              # Express app entry point, listens on port 5050
│   ├── validators.ts          # Shared validation helpers (email, ISBN, due date)
│   ├── db/
│   │   └── database.ts        # SQLite setup, schema creation & migrations (node:sqlite)
│   ├── routes/
│   │   ├── books.ts           # GET/POST /api/books
│   │   ├── members.ts         # GET/POST /api/members, GET /api/members/search
│   │   └── loans.ts           # GET /api/loans, POST /api/loans/issue & /return
│   └── client/
│       └── app.ts             # Vanilla TS frontend logic (compiled to public/app.js)
├── public/                    # Static assets served by Express
│   ├── index.html
│   ├── style.css
│   └── app.js                 # Generated from src/client/app.ts — do not edit directly
├── dist/                      # Generated backend output from tsc (gitignored)
├── data/                      # SQLite database file lives here (gitignored)
├── docs/                      # Design docs and implementation plans per ticket
├── build.js                   # Builds a deployable zip artifact (npm run build:artifact)
├── deploy-local.js            # Extracts and runs the latest artifact locally (npm run deploy:local)
├── artifacts/                 # Build output zips (gitignored)
├── deploy/                    # Local deployment target (gitignored)
├── tsconfig.json              # Backend TypeScript config
├── tsconfig.client.json       # Frontend TypeScript config
├── BUILD.md                   # Build & deploy pipeline details
└── package.json
```

## Build & Deployment

See [BUILD.md](BUILD.md) for details on packaging a build artifact and running it locally, including how database persistence works across builds.

## Intentional Limitations

These gaps are deliberate — they may be addressed in a future enhancement phase:

- No authentication
- No input validation beyond required-field, email-format, and ISBN-uniqueness checks
- No reporting or analytics
