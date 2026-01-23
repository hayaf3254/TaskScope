import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neonは基本SSLが必要。DATABASE_URLに sslmode=require を入れる想定。
  // もし繋がらなければここに ssl: { rejectUnauthorized: false } を追加する。
});
