import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as dotenv from "dotenv";
//ファイル操作(fs)、パス操作(path)、DB接続(pg)、.env読み込み(dotenv)を読み込む

dotenv.config(); //.envを読み込む

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL }); //マイグレーション専用のプールを作る。db.ts とは別のインスタンス（このスクリプトは独立して動くので）

const MIGRATIONS_DIR = path.resolve( //相対パスを絶対パスに変換
  __dirname,
  "../../../infra/db/migrations"
);
//マイグレーションファイルがある場所を絶対パスで計算する。

async function migrate() {
  const client = await pool.connect();//プールから接続を1本取り出す
  try {
    // schema_migrations テーブルがなければ作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 
      )
    `);
  //IF NOT EXISTS → 既にあっても2回目以降はエラーにならない
  //filename TEXT PRIMARY KEY → ファイル名が主キー（重複不可）
  //applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW() → 適用日時、自動入力

    // 適用済み一覧を取得
    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    const applied = new Set(rows.map((r) => r.filename)); //適用済みのファイル名一覧を取得して Set（重複なし集合）に変換する

    // マイグレーションファイルを昇順で取得
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    let appliedCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[skip] ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[ok]   ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[fail] ${file}`);
        throw err;
      }
    }

    if (appliedCount === 0) {
      console.log("Already up to date.");
    } else {
      console.log(`\nApplied ${appliedCount} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
