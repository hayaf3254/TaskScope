import { Pool } from "pg"; //クライアントライブラリ pg から Pool クラスを読み込む

if (!process.env.DATABASE_URL) { //早期エラー。DATABASE_URL がなければこのファイルを読み込んだ時点でクラッシュさせる
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neonは基本SSLが必要。DATABASE_URLに sslmode=require を入れる想定。
  // もし繋がらなければここに ssl: { rejectUnauthorized: false } を追加する。

  // Neon対策: アイドル接続を早めに解放してタイムアウトを防ぐ
  idleTimeoutMillis: 30000, // 30秒でアイドル接続を解放
  connectionTimeoutMillis: 10000, // 接続タイムアウト10秒
  max: 10, // 最大接続数
});
