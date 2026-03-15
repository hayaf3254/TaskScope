import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { registerSchema, loginSchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = process.env.COOKIE_NAME || "taskscope_jwt";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || "lax") as
  | "lax"
  | "strict"
  | "none";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = "8h";

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力内容に誤りがあります",
      fields: zodErrorToFields(parsed.error),
    });
  }

  const { email, password } = parsed.data;

  try {
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return errorResponse(res, 409, {
        code: "EMAIL_ALREADY_EXISTS",
        message: "このメールアドレスは既に登録されています",
        fields: { email: "already registered" },
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = uuidv4();
    const now = new Date();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, email, passwordHash, now, now]
      );

      await client.query(
        `INSERT INTO user_settings (user_id, created_at, updated_at)
         VALUES ($1, $2, $3)`,
        [userId, now, now]
      );

      await client.query("COMMIT");

      const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });

      res.cookie(COOKIE_NAME, token, getCookieOptions());

      res.status(201).json({
        user: {
          id: userId,
          email,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Register error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力内容に誤りがあります",
      fields: zodErrorToFields(parsed.error),
    });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 401, {
        code: "INVALID_CREDENTIALS",
        message: "メールアドレスまたはパスワードが正しくありません",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, 401, {
        code: "INVALID_CREDENTIALS",
        message: "メールアドレスまたはパスワードが正しくありません",
      });
    }

    await pool.query(
      "UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1",
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie(COOKIE_NAME, token, getCookieOptions());

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  try {
    const result = await pool.query(
      "SELECT id, email FROM users WHERE id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 401, {
        code: "UNAUTHORIZED",
        message: "ユーザーが見つかりません",
      });
    }
    const user = result.rows[0];
    res.status(200).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("Me error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAMESITE,
    domain: COOKIE_DOMAIN,
    path: "/",
  });
  res.status(204).send();
});

export default router;
