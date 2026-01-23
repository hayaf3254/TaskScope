CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "email" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "last_active_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "user_settings" (
  "user_id" uuid PRIMARY KEY,
  "weekly_target_percent" int DEFAULT null,
  "timezone" varchar NOT NULL DEFAULT 'Asia/Tokyo',
  "week_start" int NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "user_streak_cache" (
  "user_id" uuid PRIMARY KEY,
  "streak_current" int NOT NULL DEFAULT 0,
  "streak_best" int NOT NULL DEFAULT 0,
  "streak_last_date" date DEFAULT null,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "user_notification_state" (
  "user_id" uuid PRIMARY KEY,
  "line_user_id" varchar DEFAULT null,
  "notification_opt_in" boolean NOT NULL DEFAULT true,
  "notified_3d_at" timestamp DEFAULT null,
  "notified_7d_at" timestamp DEFAULT null,
  "notified_30d_at" timestamp DEFAULT null,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "line_link_codes" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "code_hash" varchar NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL
);

CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "title" varchar NOT NULL,
  "weight" int NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "archived_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "daily_checks" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "denominator_weight_snapshot" int DEFAULT null,
  "daily_percent_final" int DEFAULT null,
  "finalized_at" timestamp DEFAULT null,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "daily_check_items" (
  "id" uuid PRIMARY KEY,
  "daily_check_id" uuid NOT NULL,
  "task_id" uuid NOT NULL,
  "achievement_percent" int NOT NULL DEFAULT 0,
  "percent_before_full" int DEFAULT null,
  "weight_snapshot" int NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE "daily_stamps" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "created_at" timestamp NOT NULL
);

CREATE INDEX ON "users" ("last_active_at");

CREATE INDEX ON "user_notification_state" ("line_user_id");

CREATE INDEX ON "user_notification_state" ("notified_3d_at");

CREATE INDEX ON "user_notification_state" ("notified_7d_at");

CREATE INDEX ON "user_notification_state" ("notified_30d_at");

CREATE INDEX ON "line_link_codes" ("user_id");

CREATE INDEX ON "line_link_codes" ("expires_at");

CREATE INDEX ON "line_link_codes" ("used_at");

CREATE UNIQUE INDEX ON "line_link_codes" ("code_hash");

CREATE INDEX ON "tasks" ("user_id", "title");

CREATE INDEX ON "tasks" ("user_id", "is_active");

CREATE INDEX ON "tasks" ("user_id", "updated_at");

CREATE UNIQUE INDEX ON "daily_checks" ("user_id", "date");

CREATE INDEX ON "daily_checks" ("user_id", "updated_at");

CREATE UNIQUE INDEX ON "daily_check_items" ("daily_check_id", "task_id");

CREATE INDEX ON "daily_check_items" ("daily_check_id");

CREATE INDEX ON "daily_check_items" ("task_id");

CREATE UNIQUE INDEX ON "daily_stamps" ("user_id", "date");

CREATE INDEX ON "daily_stamps" ("user_id", "date");

COMMENT ON COLUMN "user_settings"."weekly_target_percent" IS '週目標(0-100). 設定なしはnull';

COMMENT ON COLUMN "user_settings"."week_start" IS '週開始(今は月曜固定: 1=Mon)';

COMMENT ON COLUMN "user_notification_state"."line_user_id" IS 'LINE連携済みのみ';

COMMENT ON COLUMN "line_link_codes"."code_hash" IS '生コードは保存しない';

COMMENT ON COLUMN "tasks"."weight" IS 'recommended 1-10';

COMMENT ON COLUMN "daily_checks"."date" IS 'user-local date (JST for now)';

COMMENT ON COLUMN "daily_checks"."denominator_weight_snapshot" IS '分母(合計weight_snapshot). タスク0件はnull';

COMMENT ON COLUMN "daily_checks"."daily_percent_final" IS 'キャッシュ運用(0-100). タスク0件はnull';

COMMENT ON COLUMN "daily_checks"."finalized_at" IS '将来: 確定概念を入れるなら使う（MVPでは未使用でもOK）';

COMMENT ON COLUMN "daily_check_items"."achievement_percent" IS '0-100（数値が真実）';

COMMENT ON COLUMN "daily_check_items"."percent_before_full" IS '100にする前の値(0-99). OFFで戻す用';

COMMENT ON COLUMN "daily_check_items"."weight_snapshot" IS '保存時点の重み（過去保護）';

COMMENT ON COLUMN "daily_stamps"."date" IS 'user-local date (JST for now)';

ALTER TABLE "user_settings" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "user_streak_cache" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "user_notification_state" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "line_link_codes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "tasks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "daily_checks" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("daily_check_id") REFERENCES "daily_checks" ("id");

ALTER TABLE "daily_check_items" ADD FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "daily_stamps" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id");
