# Server RAG Pipeline

![Alt text](https://images.viblo.asia/192431fe-1874-4814-a04a-74edb0ca7d7d.png)

This document explains the Retrieval-Augmented Generation (RAG) pipeline implemented in the `server/` directory.

## Overview

The server implements a classic RAG architecture: documents are uploaded, split into chunks, embedded as vectors, and stored in PostgreSQL with the pgvector extension. When a user asks a question, the question is embedded using the same model, the most similar chunks are retrieved via cosine similarity, and a generative model produces an answer grounded in those chunks.

```
                        INGEST                                    QUERY
 ┌─────────┐   ┌────────┐   ┌────────┐   ┌───────┐    ┌──────────┐   ┌────────────┐   ┌──────────┐
 │ Upload   │──▶│ Store  │──▶│ Chunk  │──▶│ Embed │    │ Embed    │──▶│ Vector     │──▶│ Generate │
 │ .txt file│   │ doc    │   │ text   │   │ chunks│    │ question │   │ search     │   │ answer   │
 └─────────┘   └────────┘   └────────┘   └───┬───┘    └──────────┘   └─────┬──────┘   └──────────┘
                                              │                             │
                                              ▼                             ▼
                                     ┌──────────────┐              ┌──────────────┐
                                     │   pgvector   │◀─────────────│   pgvector   │
                                     │   (store)    │  cosine sim  │   (search)   │
                                     └──────────────┘              └──────────────┘
```

## Startup

**File:** `src/index.ts`

On startup, the server:

1. Calls `initDb()` — reads and executes `src/db/schema.sql` against the database. All statements use `IF NOT EXISTS`, making it safe to run on every startup.
2. Starts the Express HTTP server on the configured `PORT` (default 3001).

If the database connection or schema initialization fails, the process exits immediately.

## Database Schema

**File:** `src/db/schema.sql`

```
documents                          chunks
┌──────────────┐                   ┌──────────────────┐
│ id (PK)      │──────────────────▶│ id (PK)          │
│ filename     │    1 : N          │ document_id (FK) │
│ content      │                   │ content          │
│ uploaded_at  │                   │ chunk_index      │
└──────────────┘                   │ embedding vec768 │
                                   └──────────────────┘
```

- **documents** — stores the original uploaded file (filename + full text content).
- **chunks** — stores individual text chunks with their vector embeddings. Foreign key to `documents` with `ON DELETE CASCADE`.
- **chunks_embedding_idx** — HNSW index on the `embedding` column using `vector_cosine_ops` for fast approximate nearest neighbor search.
- **pgvector extension** — enables the `vector(768)` column type and cosine distance operator (`<=>`).

## Ingest Pipeline

**Endpoint:** `POST /api/documents`
**File:** `src/routes/documents.ts`

### Step 1 — Upload

- Uses `multer` with `memoryStorage` (file stays in memory, never written to disk).
- Only `.txt` files are accepted (`text/plain` MIME type check).
- The file buffer is decoded as UTF-8.

### Step 2 — Store Document

- Inserts a row into the `documents` table with `filename` and full `content`.
- Returns the generated `id` for linking chunks.

### Step 3 — Chunk Text

**File:** `src/services/chunker.ts`

- Uses LangChain's `RecursiveCharacterTextSplitter`.
- **Chunk size:** 1000 characters.
- **Chunk overlap:** 200 characters — ensures context is not lost at chunk boundaries.
- The splitter tries to break on natural boundaries (paragraphs, sentences, words) before falling back to character-level splits.
- Returns an array of plain text strings.

### Step 4 — Embed Chunks

**File:** `src/services/embedder.ts`

- Calls the Gemini Embedding API (`gemini-embedding-001` model).
- Each chunk is embedded into a **768-dimensional** vector.
- Vectors are **L2-normalized** after generation — this converts cosine similarity into a simple dot product and ensures consistent distance calculations.
- Chunks are embedded in parallel via `Promise.all`.

### Step 5 — Store Chunks

- All chunks and their embeddings are inserted in a single bulk `INSERT` query.
- Embeddings are serialized with `JSON.stringify()` for pgvector compatibility.
- Each chunk stores: `document_id`, `content`, `chunk_index` (position in the original document), and `embedding`.

### Response

```json
{
  "id": 1,
  "filename": "example.txt",
  "uploaded_at": "2025-01-01T00:00:00.000Z",
  "chunk_count": 12
}
```

## Query Pipeline

**Endpoint:** `POST /api/query`
**File:** `src/routes/query.ts`

### Step 1 — Embed the Question

- The user's question is embedded using the same model and normalization as the ingest pipeline (`embedText()`).
- Using the same embedding model for both documents and queries ensures they share the same vector space.

### Step 2 — Vector Similarity Search

- Runs a SQL query using pgvector's cosine distance operator (`<=>`).
- Retrieves the **top 5** most similar chunks across all documents.
- Returns similarity scores as `1 - distance` (higher = more similar).
- Joins with the `documents` table to include the source filename.

```sql
SELECT c.id, c.document_id, c.content, c.chunk_index,
       1 - (c.embedding <=> $1::vector) AS similarity,
       d.filename
FROM chunks c
JOIN documents d ON d.id = c.document_id
ORDER BY c.embedding <=> $1::vector
LIMIT 5
```

### Step 3 — Generate Answer

**File:** `src/services/generator.ts`

- Passes the retrieved chunks to Gemini (`gemini-2.5-flash-lite`) as context.
- The prompt instructs the model to answer **only** from the provided context — no hallucination from training data.
- If no chunks are found, returns a message asking the user to upload documents first.

### Response

```json
{
  "answer": "The answer based on your documents...",
  "sources": [
    {
      "id": 1,
      "document_id": 1,
      "filename": "example.txt",
      "content": "chunk text...",
      "chunk_index": 0,
      "similarity": 0.87
    }
  ]
}
```

## Document Management

### List Documents

**Endpoint:** `GET /api/documents`

Returns all documents with their chunk counts, ordered by upload date (newest first).

### Delete Document

**Endpoint:** `DELETE /api/documents/:id`

Deletes a document and all its chunks (via cascade). Returns `404` if the document does not exist.

## Project Structure

```
server/src/
├── index.ts              # Entry point: initDb → start server
├── app.ts                # Express app setup (routes, middleware)
├── db/
│   ├── pool.ts           # pg Pool singleton + initDb()
│   └── schema.sql        # Database schema (single source of truth)
├── routes/
│   ├── documents.ts      # Upload, list, delete endpoints
│   └── query.ts          # Question-answering endpoint
└── services/
    ├── chunker.ts         # Text splitting (LangChain)
    ├── embedder.ts        # Vector embedding (Gemini)
    └── generator.ts       # Answer generation (Gemini)
```

## Environment Variables

| Variable       | Description                          |
|----------------|--------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string         |
| `GEMINI_API_KEY`| Google Gemini API key               |
| `PORT`         | Server port (default: 3001)          |
