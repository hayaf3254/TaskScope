import express from "express"; //Web フレームワーク本体
import helmet from "helmet"; //セキュリティ関連の HTTP ヘッダーを自動で設定するライブラリ
import morgan from "morgan"; //リクエストのログを出力するライブラリ（例: GET /api/health 200 5ms）
import cors from "cors"; //別オリジン (別ドメイン) からのリクエストを許可する設定
import cookieParser from "cookie-parser"; //リクエストの Cookie を読めるようにするライブラリ

//ルーターの設定
import authRouter from "./routes/auth";
import stampsRouter from "./routes/stamps";
import dailyRouter from "./routes/daily";
import tasksRouter from "./routes/tasks";
import weeklyRouter from "./routes/weekly";
import settingsRouter from "./routes/settings";
import { pool } from "./db";//各機能のルーターと DB接続プールを読み込む

export function createApp(options?: { disableLogger?: boolean }) { //アプリ生成関数。引数 options は省略可能。disableLogger: trueを渡すとログが出なくなる（テスト時に使う）
  const app = express(); //アプリのインスタンスを作成
  app.use(helmet()); //セキュリティヘッダーを全レスポンスに付ける
  if (!options?.disableLogger) { //disableLogger が指定されていない（=通常起動）時だけログを出す。テスト時はログが邪魔なので切れるようにしてある。
    app.use(morgan("dev"));
  }
  app.use(express.json()); //リクエストの Body を JSON として解析して req.body に入れる(これがないと POST のデータが読めない)
  app.use(cookieParser()); //Cookie を解析して req.cookies に入れる

  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin: corsOrigin ? corsOrigin.split(",") : true, //CORS_ORIGIN が設定されている場合: カンマ区切りで複数指定可能
      credentials: true, //Cookie を含むリクエストを許可
    })
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true })); //サーバが生きてるか確認するためのエンドポイント

  app.get("/api/db/ping", async (_req, res) => { //DBが生きてるか確認するためのエンドポイント
    const r = await pool.query("select now() as now");
    res.json({ ok: true, now: r.rows[0]?.now });
  });

  //URL プレフィックスとルーターを紐付け
  app.use("/api/auth", authRouter);
  app.use("/api/stamps", stampsRouter);
  app.use("/api/daily", dailyRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/weekly", weeklyRouter);
  app.use("/api/settings", settingsRouter);

  return app;
}
