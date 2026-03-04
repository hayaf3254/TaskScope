import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { pool } from "../db";
import bcrypt from "bcrypt";

const app = createApp({ disableLogger: true });

// モック型定義
const mockPool = pool as unknown as {
  query: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 新規登録成功", async () => {
    // メール重複チェック → 存在しない
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    // トランザクション用connect
    const mockClient = {
      query: vi.fn()        
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // INSERT users
        .mockResolvedValueOnce(undefined) // INSERT user_settings
        .mockResolvedValueOnce(undefined), // COMMIT
      release: vi.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("バリデーション: メール形式不正", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("バリデーション: パスワード8文字未満 (5文字)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("境界値: パスワード7文字はNG", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "1234567" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("境界値: パスワード8文字はOK", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // INSERT users
        .mockResolvedValueOnce(undefined) // INSERT user_settings
        .mockResolvedValueOnce(undefined), // COMMIT
      release: vi.fn(),
    };
    mockPool.connect.mockResolvedValueOnce(mockClient);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "12345678" });

    expect(res.status).toBe(201);
  });

  it("重複エラー: 既存メールアドレス", async () => {
    // メール重複チェック → 存在する
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: "existing-user-id" }],
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "existing@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: ログイン成功", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);

    // ユーザー検索 → 存在する
    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ id: "user-id-123", email: "test@example.com", password_hash: hashedPassword }],
      })
      // last_active_at更新
      .mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-id-123");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("認証失敗: メールアドレスが存在しない", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "notfound@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("認証失敗: パスワード不一致", async () => {
    const hashedPassword = await bcrypt.hash("correct-password", 10);

    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: "user-id-123", email: "test@example.com", password_hash: hashedPassword }],
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("バリデーション: メール形式不正", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "invalid", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/logout", () => {
  it("正常系: Cookie削除", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(204);
    // Cookieがクリアされていることを確認
    const cookie = res.headers["set-cookie"]?.[0];
    expect(cookie).toContain("taskscope_jwt=;");
  });
});
