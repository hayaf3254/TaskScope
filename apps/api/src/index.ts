import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "./db";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  COOKIE_NAME: z.string().default("taskscope_jwt"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional(),

  CORS_ORIGIN: z.string().optional(),
});
const env = Env.parse(process.env);

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// DB疎通チェック（Neon確認用）
app.get("/api/db/ping", async (_req, res) => {
  const r = await pool.query("select now() as now");
  res.json({ ok: true, now: r.rows[0]?.now });
});

// 仮ログイン（あとでDBログインに置換）
app.post("/api/auth/login", (_req, res) => {
  const token = jwt.sign({ userId: "demo-user" }, env.JWT_SECRET, { expiresIn: "14d" });

  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/",
  });

  res.json({ ok: true });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = (req as any).cookies?.[env.COOKIE_NAME];
  if (!token) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    res.json({ me: payload });
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } });
  }
});

app.listen(env.PORT, () => console.log(`[api] http://localhost:${env.PORT}`));
