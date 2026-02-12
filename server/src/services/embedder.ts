import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

export async function embedText(text: string): Promise<number[]> {
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
    config: { outputDimensionality: 768 },
  });
  return l2Normalize(result.embeddings![0].values!);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map((text) =>
      ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
        config: { outputDimensionality: 768 },
      })
    )
  );
  return results.map((r) => l2Normalize(r.embeddings![0].values!));
}

export { l2Normalize };
