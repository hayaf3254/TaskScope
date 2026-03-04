-- Migration: 0001_initial
-- 初期スキーマ (task_scorp.sql から移行)

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY,
  "email" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "last_active_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid PRIMARY KEY,
  "weekly_target_percent" int DEFAULT null,
  "timezone" varchar NOT NULL DEFAULT 'Asia/Tokyo',
  "week_start" int NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "user_settings"."weekly_target_percent" IS '週目標(0-100). 設定なしはnull';
COMMENT ON COLUMN "user_settings"."week_start" IS '週開始(今は月曜固定: 1=Mon)';

CREATE TABLE IF NOT EXISTS "user_streak_cache" (
  "user_id" uuid PRIMARY KEY,
  "streak_current" int NOT NULL DEFAULT 0,
  "streak_best" int NOT NULL DEFAULT 0,
  "streak_last_date" date DEFAULT null,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_notification_state" (
  "user_id" uuid PRIMARY KEY,
  "line_user_id" varchar DEFAULT null,
  "notification_opt_in" boolean NOT NULL DEFAULT true,
  "notified_3d_at" timestamp DEFAULT null,
  "notified_7d_at" timestamp DEFAULT null,
  "notified_30d_at" timestamp DEFAULT null,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "user_notification_state"."line_user_id" IS 'LINE連携済みのみ';

CREATE TABLE IF NOT EXISTS "line_link_codes" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "code_hash" varchar NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL
);

COMMENT ON COLUMN "line_link_codes"."code_hash" IS '生コードは保存しない';

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "title" varchar NOT NULL,
  "weight" int NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "archived_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "tasks"."weight" IS 'recommended 1-10';

CREATE TABLE IF NOT EXISTS "daily_checks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "denominator_weight_snapshot" int DEFAULT null,
  "daily_percent_final" int DEFAULT null,
  "finalized_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_checks"."date" IS 'user-local date (JST for now)';
COMMENT ON COLUMN "daily_checks"."denominator_weight_snapshot" IS '分母(合計weight_snapshot). タスク0件はnull';
COMMENT ON COLUMN "daily_checks"."daily_percent_final" IS 'キャッシュ運用(0-100). タスク0件はnull';
COMMENT ON COLUMN "daily_checks"."finalized_at" IS '将来: 確定概念を入れるなら使う（MVPでは未使用でもOK）';

CREATE TABLE IF NOT EXISTS "daily_check_items" (
  "id" uuid PRIMARY KEY,
  "daily_check_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "achievement_percent" int NOT NULL DEFAULT 0,
  "percent_before_full" int DEFAULT null,
  "weight_snapshot" int NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_check_items"."achievement_percent" IS '0-100（数値が真実）';
COMMENT ON COLUMN "daily_check_items"."percent_before_full" IS '100にする前の値(0-99). OFFで戻す用';
COMMENT ON COLUMN "daily_check_items"."weight_snapshot" IS '保存時点の重み（過去保護）';

CREATE TABLE IF NOT EXISTS "daily_stamps" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "created_at" timestamp NOT NULL
);

COMMENT ON COLUMN "daily_stamps"."date" IS 'user-local date (JST for now)';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON "users" ("last_active_at");

CREATE INDEX IF NOT EXISTS idx_user_notification_state_line_user_id ON "user_notification_state" ("line_user_id");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_3d ON "user_notification_state" ("notified_3d_at");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_7d ON "user_notification_state" ("notified_7d_at");
CREATE INDEX IF NOT EXISTS idx_user_notification_state_notified_30d ON "user_notification_state" ("notified_30d_at");

CREATE INDEX IF NOT EXISTS idx_line_link_codes_user_id ON "line_link_codes" ("user_id");
CREATE INDEX IF NOT EXISTS idx_line_link_codes_expires_at ON "line_link_codes" ("expires_at");
CREATE INDEX IF NOT EXISTS idx_line_link_codes_used_at ON "line_link_codes" ("used_at");
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_link_codes_code_hash ON "line_link_codes" ("code_hash");

CREATE INDEX IF NOT EXISTS idx_tasks_user_title ON "tasks" ("user_id", "title");
CREATE INDEX IF NOT EXISTS idx_tasks_user_active ON "tasks" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON "tasks" ("user_id", "updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_checks_user_date ON "daily_checks" ("user_id", "date");
CREATE INDEX IF NOT EXISTS idx_daily_checks_user_updated ON "daily_checks" ("user_id", "updated_at");

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_check_items_check_task ON "daily_check_items" ("daily_check_id", "task_id");
CREATE INDEX IF NOT EXISTS idx_daily_check_items_check ON "daily_check_items" ("daily_check_id");
CREATE INDEX IF NOT EXISTS idx_daily_check_items_task ON "daily_check_items" ("task_id");

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stamps_user_date ON "daily_stamps" ("user_id", "date");
CREATE INDEX IF NOT EXISTS idx_daily_stamps_user_date2 ON "daily_stamps" ("user_id", "date");

-- Foreign Keys
ALTER TABLE "user_settings" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "user_streak_cache" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "user_notification_state" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "line_link_codes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "tasks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "daily_checks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("daily_check_id") REFERENCES "daily_checks" ("id");
ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");
ALTER TABLE "daily_stamps" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
