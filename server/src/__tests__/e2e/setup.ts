import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const TEST_DB = "remind_rag_test";
const ADMIN_URL = "postgresql://localhost:5432/postgres";
const TEST_URL = `postgresql://localhost:5432/${TEST_DB}`;

let testPool: Pool;

export function getTestPool(): Pool {
  return testPool;
}

export async function setupTestDB(): Promise<void> {
  const adminPool = new Pool({ connectionString: ADMIN_URL });

  try {
    // Drop and recreate test database
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }

  // Connect to test DB and run schema
  testPool = new Pool({ connectionString: TEST_URL });
  const schema = readFileSync(
    join(__dirname, "../../db/schema.sql"),
    "utf-8"
  );
  await testPool.query(schema);

  // Override the pool used by the app
  jest.doMock("../../db/pool", () => ({
    __esModule: true,
    default: testPool,
  }));
}

export async function teardownTestDB(): Promise<void> {
  if (testPool) {
    await testPool.end();
  }
  const adminPool = new Pool({ connectionString: ADMIN_URL });
  try {
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }
}

export async function cleanTables(): Promise<void> {
  await testPool.query("DELETE FROM chunks");
  await testPool.query("DELETE FROM documents");
}
