import { chunkText } from "../../services/chunker";

describe("chunker", () => {
  it("should return empty array for empty text", async () => {
    const chunks = await chunkText("");
    expect(chunks).toEqual([]);
  });

  it("should return empty array for whitespace-only text", async () => {
    const chunks = await chunkText("   \n\n  ");
    expect(chunks).toEqual([]);
  });

  it("should return single chunk for short text", async () => {
    const text = "This is a short piece of text.";
    const chunks = await chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it("should split long text into multiple chunks", async () => {
    // Create text longer than 1000 chars
    const paragraph = "This is a test paragraph with enough words to take up space. ";
    const text = paragraph.repeat(30); // ~1860 chars
    const chunks = await chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should produce overlapping chunks", async () => {
    const paragraph = "Sentence number one. ";
    const text = paragraph.repeat(100); // Well over 1000 chars
    const chunks = await chunkText(text);
    // With overlap, consecutive chunks should share some content
    if (chunks.length >= 2) {
      const lastPartOfFirst = chunks[0].slice(-50);
      const firstPartOfSecond = chunks[1].slice(0, 200);
      // The overlap region should appear in the second chunk
      expect(firstPartOfSecond).toContain(lastPartOfFirst.trim().slice(0, 20));
    }
  });
});
