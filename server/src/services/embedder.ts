import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const EMBEDDING_DIM = 768;
const EMBEDDING_MODEL = "gemini-embedding-001";

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  return l2Normalize(result.embeddings![0].values!);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((text) =>
      ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: EMBEDDING_DIM },
      }),
    ),
  );
  return results.map((r) => l2Normalize(r.embeddings![0].values!));
}

export { l2Normalize };
