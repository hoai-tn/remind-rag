import { Router, Request, Response } from "express";
import pool from "../db/pool";
import { embedText } from "../services/embedder";
import { generateAnswer, ChunkResult } from "../services/generator";

const router = Router();

// POST /api/query — embed question, vector search, generate answer
router.post("/", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "Question is required" });
      return;
    }

    // Embed the question
    const queryEmbedding = await embedText(question);

    // Vector similarity search
    const result = await pool.query(
      `SELECT c.id, c.document_id, c.content, c.chunk_index,
              1 - (c.embedding <=> $1::vector) AS similarity,
              d.filename
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       ORDER BY c.embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(queryEmbedding)]
    );

    const chunks: ChunkResult[] = result.rows;

    // Generate answer
    const answer = await generateAnswer(question, chunks);

    res.json({
      answer,
      sources: chunks.map((c) => ({
        id: c.id,
        document_id: c.document_id,
        filename: c.filename,
        content: c.content,
        chunk_index: c.chunk_index,
        similarity: parseFloat(String(c.similarity)),
      })),
    });
  } catch (err: any) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
