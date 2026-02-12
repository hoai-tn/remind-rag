import { Router, Request, Response } from "express";
import multer from "multer";
import pool from "../db/pool";
import { chunkText } from "../services/chunker";
import { embedBatch } from "../services/embedder";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only .txt files are allowed"));
    }
  },
});

// POST /api/documents — upload, chunk, embed, store
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const content = file.buffer.toString("utf-8");
    const filename = file.originalname;

    // Insert document
    const docResult = await pool.query(
      "INSERT INTO documents (filename, content) VALUES ($1, $2) RETURNING id, filename, uploaded_at",
      [filename, content]
    );
    const doc = docResult.rows[0];

    // Chunk text
    const chunks = await chunkText(content);

    if (chunks.length > 0) {
      // Embed all chunks
      const embeddings = await embedBatch(chunks);

      // Insert chunks with embeddings
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      for (let i = 0; i < chunks.length; i++) {
        placeholders.push(
          `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`
        );
        values.push(doc.id, chunks[i], i, JSON.stringify(embeddings[i]));
        paramIndex += 4;
      }

      await pool.query(
        `INSERT INTO chunks (document_id, content, chunk_index, embedding) VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    res.status(201).json({
      id: doc.id,
      filename: doc.filename,
      uploaded_at: doc.uploaded_at,
      chunk_count: chunks.length,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents — list all documents with chunk counts
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.filename, d.uploaded_at, COUNT(c.id)::int AS chunk_count
       FROM documents d
       LEFT JOIN chunks c ON c.document_id = d.id
       GROUP BY d.id
       ORDER BY d.uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("List error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id — delete document (chunks cascade)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM documents WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json({ deleted: true });
  } catch (err: any) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
