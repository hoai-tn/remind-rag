import { l2Normalize } from "../../services/embedder";

// Mock @google/genai
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        embedContent: jest.fn().mockResolvedValue({
          embeddings: [{ values: Array(768).fill(0.1) }],
        }),
      },
    })),
  };
});

describe("embedder", () => {
  describe("l2Normalize", () => {
    it("should produce a unit vector", () => {
      const vec = [3, 4]; // norm = 5
      const normalized = l2Normalize(vec);
      const norm = Math.sqrt(
        normalized.reduce((sum, v) => sum + v * v, 0)
      );
      expect(norm).toBeCloseTo(1.0, 5);
    });

    it("should handle zero vector", () => {
      const vec = [0, 0, 0];
      const normalized = l2Normalize(vec);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it("should preserve direction", () => {
      const vec = [1, 2, 3];
      const normalized = l2Normalize(vec);
      // Ratios should be preserved
      expect(normalized[1] / normalized[0]).toBeCloseTo(2, 5);
      expect(normalized[2] / normalized[0]).toBeCloseTo(3, 5);
    });

    it("should produce correct dimensions for 768-dim vector", () => {
      const vec = Array.from({ length: 768 }, (_, i) => Math.sin(i));
      const normalized = l2Normalize(vec);
      expect(normalized).toHaveLength(768);
      const norm = Math.sqrt(
        normalized.reduce((sum, v) => sum + v * v, 0)
      );
      expect(norm).toBeCloseTo(1.0, 5);
    });
  });

  describe("embedText", () => {
    it("should return a normalized 768-dim vector", async () => {
      const { embedText } = require("../../services/embedder");
      const result = await embedText("test text");
      expect(result).toHaveLength(768);
      const norm = Math.sqrt(result.reduce((s: number, v: number) => s + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 5);
    });
  });

  describe("embedBatch", () => {
    it("should return normalized vectors for each text", async () => {
      const { embedBatch } = require("../../services/embedder");
      const results = await embedBatch(["text one", "text two"]);
      expect(results).toHaveLength(2);
      for (const vec of results) {
        expect(vec).toHaveLength(768);
        const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0));
        expect(norm).toBeCloseTo(1.0, 5);
      }
    });
  });
});
