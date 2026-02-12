CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
    id          SERIAL PRIMARY KEY,
    filename    TEXT NOT NULL,
    content     TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chunks (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding   vector(768) NOT NULL
);

CREATE INDEX chunks_embedding_idx ON chunks
    USING hnsw (embedding vector_cosine_ops);
