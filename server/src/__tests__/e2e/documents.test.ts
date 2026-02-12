import request from "supertest";
import { setupTestDB, teardownTestDB, cleanTables, getTestPool } from "./setup";

// Mock Gemini embeddings
jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        embedContent: jest.fn().mockResolvedValue({
          embeddings: [
            {
              values: Array.from({ length: 768 }, (_, i) =>
                Math.sin(i * 0.01)
              ),
            },
          ],
        }),
      },
    })),
  };
});

let app: any;

beforeAll(async () => {
  await setupTestDB();
  // Import app after mock setup so it uses the test pool
  app = (await import("../../app")).default;
}, 30000);

afterAll(async () => {
  await teardownTestDB();
}, 15000);

beforeEach(async () => {
  await cleanTables();
});

describe("POST /api/documents", () => {
  it("should upload a .txt file and return document with chunk count", async () => {
    const res = await request(app)
      .post("/api/documents")
      .attach("file", Buffer.from("This is test content."), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.filename).toBe("test.txt");
    expect(res.body.chunk_count).toBeGreaterThanOrEqual(1);
  });

  it("should reject non-txt files", async () => {
    const res = await request(app)
      .post("/api/documents")
      .attach("file", Buffer.from("<html></html>"), {
        filename: "test.html",
        contentType: "text/html",
      });

    expect(res.status).toBe(500);
  });

  it("should return 400 when no file is uploaded", async () => {
    const res = await request(app).post("/api/documents");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/documents", () => {
  it("should list all documents with chunk counts", async () => {
    // Upload a document first
    await request(app)
      .post("/api/documents")
      .attach("file", Buffer.from("Some content for testing."), {
        filename: "doc1.txt",
        contentType: "text/plain",
      });

    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty("filename", "doc1.txt");
    expect(res.body[0]).toHaveProperty("chunk_count");
  });

  it("should return empty array when no documents exist", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("DELETE /api/documents/:id", () => {
  it("should delete document and cascade chunks", async () => {
    const uploadRes = await request(app)
      .post("/api/documents")
      .attach("file", Buffer.from("Content to delete."), {
        filename: "delete-me.txt",
        contentType: "text/plain",
      });

    const docId = uploadRes.body.id;

    const deleteRes = await request(app).delete(`/api/documents/${docId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.deleted).toBe(true);

    // Verify chunks are also deleted
    const pool = getTestPool();
    const chunksResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM chunks WHERE document_id = $1",
      [docId]
    );
    expect(chunksResult.rows[0].count).toBe(0);
  });

  it("should return 404 for non-existent document", async () => {
    const res = await request(app).delete("/api/documents/99999");
    expect(res.status).toBe(404);
  });
});
