# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (`server/`)
```bash
cd server && npm run dev          # Start dev server with hot reload (tsx watch, port 3001)
cd server && npm test             # Run all tests
cd server && npx jest --testPathPattern=unit    # Unit tests only
cd server && npx jest --testPathPattern=e2e     # E2E tests (requires remind_rag_test DB with pgvector)
cd server && npx jest --testPathPattern=unit/chunker  # Single test file
cd server && npx tsc --noEmit     # Type-check without emitting
```

### Client (`client/`)
```bash
cd client && npm run dev          # Start Vite dev server (proxies /api → localhost:3001)
cd client && npx tsc --noEmit     # Type-check
```

### Database Setup
```bash
createdb remind_rag
psql -d remind_rag -f server/src/db/schema.sql
```

## Architecture

RAG pipeline: upload .txt → chunk (1000 chars, 200 overlap) → embed via Gemini → store in pgvector → query embeds question → cosine similarity search (top 5) → Gemini generates answer from retrieved chunks.

### Server
- **`app.ts`** creates the Express app (exported separately from `index.ts` for supertest usage in e2e tests)
- **`db/pool.ts`** — singleton pg Pool from `DATABASE_URL` env var. E2E tests override this via `jest.doMock`
- **`services/`** — pure business logic: `chunker.ts` (LangChain splitter), `embedder.ts` (Gemini text-embedding-004, 768-dim, L2-normalized), `generator.ts` (Gemini 2.0 Flash)
- **`routes/documents.ts`** — multer memoryStorage, .txt only. POST does the full ingest pipeline (chunk → embed → bulk insert)
- **`routes/query.ts`** — embeds question, runs `ORDER BY embedding <=> query_vec LIMIT 5`, passes chunks to generator

### Client
- Vite + React 19 + Tailwind CSS v4 (`@tailwindcss/vite` plugin) + shadcn/ui (new-york style)
- Path alias: `@/*` → `./src/*`
- `api.ts` has typed fetch wrappers; all state lives in `App.tsx` and is passed down as props
- shadcn/ui components in `components/ui/` — generated via `npx shadcn@latest add`

### Testing
- Unit tests mock `@google/genai` with `jest.mock()` at module level
- E2E tests (`__tests__/e2e/setup.ts`) create/drop a `remind_rag_test` database, run `schema.sql`, and mock only the Gemini API — the database is real
- `l2Normalize` is exported from `embedder.ts` specifically for direct unit testing

### Key Conventions
- Raw `pg` queries everywhere (no ORM). Embeddings passed as `JSON.stringify(vector)` to pgvector
- Server uses CommonJS modules (`"module": "commonjs"` in tsconfig); client uses ESNext
- Environment: `DATABASE_URL`, `GEMINI_API_KEY`, `PORT` in `server/.env`
