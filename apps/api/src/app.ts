import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import stampsRouter from "./routes/stamps";
import dailyRouter from "./routes/daily";
import tasksRouter from "./routes/tasks";
import weeklyRouter from "./routes/weekly";
import settingsRouter from "./routes/settings";
import { pool } from "./db";

export function createApp(options?: { disableLogger?: boolean }) {
  const app = express();
  app.use(helmet());
  if (!options?.disableLogger) {
    app.use(morgan("dev"));
  }
  app.use(express.json());
  app.use(cookieParser());

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin ? corsOrigin.split(",") : true,
      credentials: true, // Cookieを含むリクエストを許可
    })
  );

  // デプロイ先の死活監視用
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // DB疎通確認用
  app.get("/api/db/ping", async (_req, res) => {
    const r = await pool.query("select now() as now");
    res.json({ ok: true, now: r.rows[0]?.now });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/stamps", stampsRouter);
  app.use("/api/daily", dailyRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/weekly", weeklyRouter);
  app.use("/api/settings", settingsRouter);

  return app;
}
