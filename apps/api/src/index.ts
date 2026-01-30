import "dotenv/config";
import { z } from "zod";
import { createApp } from "./app";

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

const app = createApp();

app.listen(env.PORT, () => console.log(`[api] http://localhost:${env.PORT}`));
