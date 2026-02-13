import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ChunkResult {
  id: number;
  document_id: number;
  content: string;
  chunk_index: number;
  similarity: number;
  filename: string;
}

export async function generateAnswer(
  question: string,
  chunks: ChunkResult[]
): Promise<string> {
  if (chunks.length === 0) {
    return "No documents found to answer your question. Please upload some documents first.";
  }

  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1} - ${c.filename}]\n${c.content}`
    )
    .join("\n\n");

  const prompt = `
    You are a helpful assistant that answers questions based on the provided context.
    Use ONLY the information from the context below to answer the question.
    If the context doesn't contain enough information to answer, say so clearly.

    Context:
    ${context}

    Question: ${question}

    Answer:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  return response.text ?? "Failed to generate an answer.";
}
