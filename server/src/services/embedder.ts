import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables from .env file (e.g., GEMINI_API_KEY)
dotenv.config();

// Initialize the Google Gemini AI client using the API key from environment
export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Embedding vector size — 768 dimensions is the output size we request from Gemini
const EMBEDDING_DIM = 768;
// The Gemini model used to convert text into numerical vectors (embeddings)
const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * L2 (Euclidean) normalization — scales a vector so its length (magnitude) equals 1.
 * This is important because cosine similarity (used in pgvector search) works best
 * when vectors are unit-length. Without normalization, longer vectors would
 * dominate similarity comparisons regardless of their actual direction/meaning.
 *
 * Formula: each element is divided by the vector's magnitude (sqrt of sum of squares).
 */
function l2Normalize(vec: number[]): number[] {
  // Calculate the magnitude: sqrt(v1² + v2² + ... + vn²)
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  // Avoid division by zero for a zero vector
  if (norm === 0) return vec;
  // Divide every element by the magnitude to get a unit vector
  return vec.map((v) => v / norm);
}

/**
 * Embed a single text string into a 768-dimensional numerical vector.
 * This vector captures the semantic meaning of the text — similar texts
 * will produce vectors that are close together in vector space.
 *
 * Used when embedding a user's search query.
 */
export async function embedText(text: string): Promise<number[]> {
  // Call the Gemini embedding API to convert text → vector
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  // Normalize the returned vector before storing/comparing
  return l2Normalize(result.embeddings![0].values!);
}

/**
 * Embed multiple texts in parallel and return an array of vectors.
 * Each text is embedded independently via Promise.all for concurrency.
 *
 * Used during document ingestion to embed all chunks at once.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Fire all embedding requests concurrently using Promise.all
  const results = await Promise.all(
    texts.map((text) =>
      ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: EMBEDDING_DIM },
      }),
    ),
  );
  // Normalize each resulting vector
  return results.map((r) => l2Normalize(r.embeddings![0].values!));
}

export { l2Normalize };
