import { vi } from "vitest";

// テスト用環境変数
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-key-12345";
process.env.COOKIE_NAME = "taskscope_jwt";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAMESITE = "lax";

// DBモック
vi.mock("../db", () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));
