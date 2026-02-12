import request from "supertest";
import {
  setupTestDB,
  teardownTestDB,
  cleanTables,
  getTestPool,
} from "./setup";

// Create a consistent embedding for testing
const testEmbedding = Array.from({ length: 768 }, (_, i) =>
  Math.sin(i * 0.01)
);
const norm = Math.sqrt(testEmbedding.reduce((s, v) => s + v * v, 0));
const normalizedEmbedding = testEmbedding.map((v) => v / norm);

// Mock Gemini
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        embedContent: jest.fn().mockResolvedValue({
          embeddings: [{ values: Array.from({ length: 768 }, (_, i) => Math.sin(i * 0.01)) }],
        }),
        generateContent: jest.fn().mockResolvedValue({
          text: "This is a test answer based on the provided context.",
        }),
      },
    })),
  };
});

let app: any;

beforeAll(async () => {
  await setupTestDB();
  app = (await import("../../app")).default;
}, 30000);

afterAll(async () => {
  await teardownTestDB();
}, 15000);

beforeEach(async () => {
  await cleanTables();
});

describe("POST /api/query", () => {
  it("should return answer and sources for a valid question", async () => {
    const pool = getTestPool();

    // Insert a test document
    const docRes = await pool.query(
      "INSERT INTO documents (filename, content) VALUES ($1, $2) RETURNING id",
      ["test.txt", "TypeScript is a typed superset of JavaScript."]
    );
    const docId = docRes.rows[0].id;

    // Insert a test chunk with embedding
    await pool.query(
      "INSERT INTO chunks (document_id, content, chunk_index, embedding) VALUES ($1, $2, $3, $4)",
      [
        docId,
        "TypeScript is a typed superset of JavaScript.",
        0,
        JSON.stringify(normalizedEmbedding),
      ]
    );

    const res = await request(app)
      .post("/api/query")
      .send({ question: "What is TypeScript?" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("answer");
    expect(res.body.answer).toBe(
      "This is a test answer based on the provided context."
    );
    expect(res.body).toHaveProperty("sources");
    expect(res.body.sources.length).toBeGreaterThan(0);
    expect(res.body.sources[0]).toHaveProperty("filename", "test.txt");
    expect(res.body.sources[0]).toHaveProperty("similarity");
  });

  it("should return no-documents message when no chunks exist", async () => {
    const res = await request(app)
      .post("/api/query")
      .send({ question: "What is anything?" });

    expect(res.status).toBe(200);
    expect(res.body.answer).toContain("No documents found");
    expect(res.body.sources).toHaveLength(0);
  });

  it("should return 400 when question is missing", async () => {
    const res = await request(app).post("/api/query").send({});
    expect(res.status).toBe(400);
  });
});
