import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { requireAuth, AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET!;

function createTestApp() {
  const app = express();
  app.use(cookieParser());

  // 認証が必要なテスト用エンドポイント
  app.get("/protected", requireAuth, (req, res) => {
    const authReq = req as AuthRequest;
    res.json({ userId: authReq.userId });
  });

  return app;
}

describe("requireAuth middleware", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  it("トークンなし: 401を返す", async () => {
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("認証が必要です");
  });

  it("無効なトークン: 401を返す", async () => {
    const res = await request(app)
      .get("/protected")
      .set("Cookie", "taskscope_jwt=invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("認証トークンが無効または期限切れです");
  });

  it("期限切れトークン: 401を返す", async () => {
    const expiredToken = jwt.sign({ userId: "user-123" }, JWT_SECRET, {
      expiresIn: "-1s",
    });

    const res = await request(app)
      .get("/protected")
      .set("Cookie", `taskscope_jwt=${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("有効なトークン: userIdがセットされる", async () => {
    const validToken = jwt.sign({ userId: "user-123" }, JWT_SECRET, {
      expiresIn: "1h",
    });

    const res = await request(app)
      .get("/protected")
      .set("Cookie", `taskscope_jwt=${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-123");
  });
});
