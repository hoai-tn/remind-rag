// Mock @google/genai before importing
jest.mock("@google/genai", () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    text: "This is a generated answer.",
  });
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
  };
});

import { generateAnswer, ChunkResult } from "../../services/generator";

describe("generator", () => {
  it("should return a no-documents message when chunks are empty", async () => {
    const answer = await generateAnswer("What is this?", []);
    expect(answer).toContain("No documents found");
  });

  it("should call Gemini and return generated text", async () => {
    const chunks: ChunkResult[] = [
      {
        id: 1,
        document_id: 1,
        content: "TypeScript is a typed superset of JavaScript.",
        chunk_index: 0,
        similarity: 0.95,
        filename: "ts-intro.txt",
      },
    ];
    const answer = await generateAnswer("What is TypeScript?", chunks);
    expect(answer).toBe("This is a generated answer.");
  });

  it("should include context from chunks in the prompt", async () => {
    const { GoogleGenAI } = require("@google/genai");
    const mockInstance = new GoogleGenAI({ apiKey: "test" });
    const generateContentMock = mockInstance.models.generateContent;

    const chunks: ChunkResult[] = [
      {
        id: 1,
        document_id: 1,
        content: "React is a JavaScript library for building user interfaces.",
        chunk_index: 0,
        similarity: 0.9,
        filename: "react.txt",
      },
      {
        id: 2,
        document_id: 1,
        content: "React uses a virtual DOM for efficient rendering.",
        chunk_index: 1,
        similarity: 0.85,
        filename: "react.txt",
      },
    ];

    await generateAnswer("What is React?", chunks);

    // Verify the prompt contains the chunk content
    const lastCall = generateContentMock.mock.calls.at(-1)[0];
    expect(lastCall.contents).toContain("React is a JavaScript library");
    expect(lastCall.contents).toContain("virtual DOM");
    expect(lastCall.contents).toContain("What is React?");
  });
});
