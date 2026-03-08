import "dotenv/config"; //envを読み込む
import { z } from "zod"; //バリデーションライブラリ
import { createApp } from "./app"; //app.tsを読み込む

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3001),//数値型に変換

  DATABASE_URL: z.string().min(1),//空文字NG

  JWT_SECRET: z.string().min(16),//JWT_SECRETは16文字以上、少ないと危険
  COOKIE_NAME: z.string().default("taskscope_jwt"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"), //指定した値以外はエラー(enum)
  COOKIE_DOMAIN: z.string().optional(),

  CORS_ORIGIN: z.string().optional(),
});
export const env = Env.parse(process.env);

const app = createApp();//app.ts の関数を呼んで Express アプリを作る。

app.listen(env.PORT, () => console.log(`[api] http://localhost:${env.PORT}`));
