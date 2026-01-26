import "dotenv/config";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { z } from "zod";
import { pool } from "./db";
import authRouter from "./routes/auth";
import stampsRouter from "./routes/stamps";
import dailyRouter from "./routes/daily";
import tasksRouter from "./routes/tasks";
import weeklyRouter from "./routes/weekly";

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
export const env = Env.parse(process.env);

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

// 認証API
app.use("/api/auth", authRouter);

// スタンプAPI
app.use("/api/stamps", stampsRouter);

// 日次API
app.use("/api/daily", dailyRouter);

// タスクAPI
app.use("/api/tasks", tasksRouter);

// 週次API
app.use("/api/weekly", weeklyRouter);

app.listen(env.PORT, () => console.log(`[api] http://localhost:${env.PORT}`));
