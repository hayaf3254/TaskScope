-- Migration: 0001_initial
-- 初期スキーマ (task_scorp.sql から移行)

-- =====================================================
-- テーブル全体の関係図
--
-- users（ユーザー）
--   ├── user_settings           [1:1]  週目標・タイムゾーン設定
--   ├── user_streak_cache       [1:1]  連続達成日数のキャッシュ
--   ├── user_notification_state [1:1]  LINE通知設定
--   ├── line_link_codes         [1:N]  LINE連携コード（Phase 2用）
--   ├── tasks                   [1:N]  ユーザーが登録したタスク
--   ├── daily_checks            [1:N]  1日1レコードの達成率キャッシュ
--   │     └── daily_check_items [1:N]  タスクごとの達成度明細
--   └── daily_stamps            [1:N]  スタンプ記録
-- =====================================================

-- -----------------------------------------------------
-- users テーブル: ユーザー情報を管理する
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
  -- UUIDを主キーに使う。連番（1,2,3...）だと次のIDを攻撃者に予測されてしまうため、
  -- 推測不可能なUUIDを使ってセキュリティを高める
  "id" uuid PRIMARY KEY,

  -- UNIQUEで同じメールアドレスの重複登録をDBレベルで防ぐ
  "email" varchar UNIQUE NOT NULL,

  -- パスワードは平文で保存しない。bcryptでハッシュ化した文字列だけを保存する。
  -- DBが漏洩してもハッシュから元のパスワードは復元できない
  "password_hash" varchar NOT NULL,

  -- 最後にログインした日時。「N日間未アクセスのユーザーに通知」などの機能で使う
  "last_active_at" timestamp DEFAULT null,

  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

-- -----------------------------------------------------
-- user_settings テーブル: ユーザーごとの設定値（usersと1:1対応）
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_settings" (
  -- users.id と同じIDを主キーにすることで「1ユーザー = 1設定」を強制する
  "user_id" uuid PRIMARY KEY,

  -- 週の目標達成率（0〜100）。未設定はnull
  "weekly_target_percent" int DEFAULT null,

  -- タイムゾーン。将来的な多タイムゾーン対応への拡張ポイント
  "timezone" varchar NOT NULL DEFAULT 'Asia/Tokyo',

  -- 週の開始曜日。1=月曜日。現在は月曜固定
  "week_start" int NOT NULL DEFAULT 1,

  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "user_settings"."weekly_target_percent" IS '週目標(0-100). 設定なしはnull';
COMMENT ON COLUMN "user_settings"."week_start" IS '週開始(今は月曜固定: 1=Mon)';

-- -----------------------------------------------------
-- user_streak_cache テーブル: 連続達成日数のキャッシュ（usersと1:1対応）
-- 毎回daily_checksを集計し直すと重いため、計算済みの値をここに保持する
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_streak_cache" (
  "user_id" uuid PRIMARY KEY,
  "streak_current" int NOT NULL DEFAULT 0, -- 現在の連続日数
  "streak_best" int NOT NULL DEFAULT 0,    -- 過去最高の連続日数
  "streak_last_date" date DEFAULT null,    -- 最後に達成した日付
  "updated_at" timestamp NOT NULL
);

-- -----------------------------------------------------
-- user_notification_state テーブル: LINE通知の設定・送信履歴（Phase 2実装予定）
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "user_notification_state" (
  "user_id" uuid PRIMARY KEY,
  "line_user_id" varchar DEFAULT null,           -- LINE連携済みのユーザーのみ値が入る
  "notification_opt_in" boolean NOT NULL DEFAULT true, -- 通知を受け取るかどうか
  "notified_3d_at" timestamp DEFAULT null,       -- 3日未入力の通知を送った日時
  "notified_7d_at" timestamp DEFAULT null,       -- 7日未入力の通知を送った日時
  "notified_30d_at" timestamp DEFAULT null,      -- 30日未入力の通知を送った日時
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "user_notification_state"."line_user_id" IS 'LINE連携済みのみ';

-- -----------------------------------------------------
-- line_link_codes テーブル: LINE連携時に発行する一時コード（Phase 2実装予定）
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "line_link_codes" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  -- 生コードは保存しない（漏洩リスク排除）。ハッシュ化した値だけ保存する
  "code_hash" varchar NOT NULL,
  "expires_at" timestamp NOT NULL,  -- コードの有効期限
  "used_at" timestamp DEFAULT null, -- 使用済みになった日時（null = 未使用）
  "created_at" timestamp NOT NULL
);

COMMENT ON COLUMN "line_link_codes"."code_hash" IS '生コードは保存しない';

-- -----------------------------------------------------
-- tasks テーブル: ユーザーが登録する学習タスクを管理する
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "title" varchar NOT NULL,

  -- このアプリの核心。タスクの重み（推奨1〜10）。
  -- 英語=10・数学=5なら英語の方が達成率への貢献が2倍になる
  "weight" int NOT NULL,

  -- 論理削除の仕組み。タスクを消す代わりにis_active=falseにしてarchived_atに日時を入れる。
  -- 物理削除（行ごと消す）すると過去のdaily_check_itemsのtask_idが宙に浮いてデータが壊れる
  "is_active" boolean NOT NULL DEFAULT true,
  "archived_at" timestamp DEFAULT null,

  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "tasks"."weight" IS 'recommended 1-10';

-- -----------------------------------------------------
-- daily_checks テーブル: 1ユーザー×1日=1レコードの達成率キャッシュ
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "daily_checks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL, -- JSTでのユーザーローカル日付

  -- スナップショット設計: 後からタスクのweightを変えても過去の達成率が変わらないよう、
  -- 計算時点の値をそのまま保存する
  "denominator_weight_snapshot" int DEFAULT null, -- 分母（有効タスクの合計weight）。タスク0件はnull
  "daily_percent_final" int DEFAULT null,         -- 計算済み達成率（0-100）のキャッシュ。タスク0件はnull

  "finalized_at" timestamp DEFAULT null, -- 将来: 確定概念を入れるなら使う（MVPでは未使用でもOK）
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_checks"."date" IS 'user-local date (JST for now)';
COMMENT ON COLUMN "daily_checks"."denominator_weight_snapshot" IS '分母(合計weight_snapshot). タスク0件はnull';
COMMENT ON COLUMN "daily_checks"."daily_percent_final" IS 'キャッシュ運用(0-100). タスク0件はnull';
COMMENT ON COLUMN "daily_checks"."finalized_at" IS '将来: 確定概念を入れるなら使う（MVPでは未使用でもOK）';

-- -----------------------------------------------------
-- daily_check_items テーブル: daily_checksの明細。タスクごとの達成度を記録する
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "daily_check_items" (
  "id" uuid PRIMARY KEY,
  "daily_check_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,

  -- 0〜100の達成度。50=「このタスクを半分やった」
  "achievement_percent" int NOT NULL DEFAULT 0,

  -- 100%にする前の値を保存。チェックOFF時に元の値に戻すために使う
  -- 例: 60%の状態でON→percent_before_full=60を保存→OFFにしたら60%に戻る
  "percent_before_full" int DEFAULT null,

  -- 記録時点のweightを保存（スナップショット）。
  -- 後でタスクのweightが変わっても過去の計算結果を守る
  "weight_snapshot" int NOT NULL,

  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_check_items"."achievement_percent" IS '0-100（数値が真実）';
COMMENT ON COLUMN "daily_check_items"."percent_before_full" IS '100にする前の値(0-99). OFFで戻す用';
COMMENT ON COLUMN "daily_check_items"."weight_snapshot" IS '保存時点の重み（過去保護）';

-- -----------------------------------------------------
-- daily_stamps テーブル: 1ユーザー×1日=1スタンプを記録する
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "daily_stamps" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL, -- JSTでのユーザーローカル日付
  "created_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_stamps"."date" IS 'user-local date (JST for now)';

-- =====================================================
-- Indexes（インデックス）
-- 本の索引と同じ仕組み。なければ全行スキャン（遅い）、あれば一瞬で検索できる。
-- ただしINSERT/UPDATE時に索引の更新コストがかかるため、必要な列にだけ作る
-- =====================================================

-- last_active_at: 「N日間アクセスなし」のユーザーを抽出する通知処理で使う
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON "users" ("last_active_at");

-- LINE通知関連: 通知対象ユーザーを日時で絞り込む
CREATE INDEX IF NOT EXISTS idx_user_notification_state_line_user_id ON "user_notification_state" ("line_user_id");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_3d ON "user_notification_state" ("notified_3d_at");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_7d ON "user_notification_state" ("notified_7d_at");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_30d ON "user_notification_state" ("notified_30d_at");

-- line_link_codes: コードハッシュ検索・有効期限切れコードの削除に使う
CREATE INDEX IF NOT EXISTS idx_line_link_codes_user_id ON "line_link_codes" ("user_id");
CREATE INDEX IF NOT EXISTS idx_line_link_codes_expires_at ON "line_link_codes" ("expires_at");
CREATE INDEX IF NOT EXISTS idx_line_link_codes_used_at ON "line_link_codes" ("used_at");
-- UNIQUEインデックス: 同じハッシュの重複登録をDBレベルで防ぐ
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_link_codes_code_hash ON "line_link_codes" ("code_hash");

-- tasks: 「このユーザーのアクティブなタスク一覧」を高速に取得するために使う
CREATE INDEX IF NOT EXISTS idx_tasks_user_title ON "tasks" ("user_id", "title");
CREATE INDEX IF NOT EXISTS idx_tasks_user_active ON "tasks" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON "tasks" ("user_id", "updated_at");

-- daily_checks:
-- UNIQUEインデックス: DBレベルで「1ユーザー×1日=1レコード」を強制する。
-- アプリ側でチェックしなくてもDBが重複を弾いてくれる
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_checks_user_date ON "daily_checks" ("user_id", "date");
CREATE INDEX IF NOT EXISTS idx_daily_checks_user_updated ON "daily_checks" ("user_id", "updated_at");

-- daily_check_items:
-- UNIQUEインデックス: 同じ日・同じタスクの明細が重複しないことを保証する
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_check_items_check_task ON "daily_check_items" ("daily_check_id", "task_id");
CREATE INDEX IF NOT EXISTS idx_daily_check_items_check ON "daily_check_items" ("daily_check_id");
CREATE INDEX IF NOT EXISTS idx_daily_check_items_task ON "daily_check_items" ("task_id");

-- daily_stamps: UNIQUEインデックスで1日1スタンプを保証する
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stamps_user_date ON "daily_stamps" ("user_id", "date");
CREATE INDEX IF NOT EXISTS idx_daily_stamps_user_date2 ON "daily_stamps" ("user_id", "date");

-- =====================================================
-- Foreign Keys（外部キー制約）
-- 「存在しないユーザーIDのタスクは作れない」など、テーブル間の整合性を
-- DBが自動で保証する。アプリ側でIDの存在確認をしなくてよい
-- =====================================================
ALTER TABLE "user_settings" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "user_streak_cache" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "user_notification_state" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "line_link_codes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "daily_checks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("daily_check_id") REFERENCES "daily_checks" ("id");
ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");
ALTER TABLE "daily_stamps" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
