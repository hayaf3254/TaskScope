# TaskScope API Spec (MVP) — v0.2.1準拠

このドキュメントは **MVPのAPI仕様の正本**（source of truth）です。  
OpenAPI化はこの内容を元に後で行います。

---

## 1. 共通

### 1.1 Base URL
- `/api`

### 1.2 認証（Cookie / JWT）
- 認証は **JWT**
- JWTは **httpOnly Cookie** に保存（Cookie名例：`access_token`）
- フロントは `fetch(..., { credentials: "include" })` を使う
- **同一オリジン前提**（MVP）

> Bearerヘッダはアプリ認証では使わない（外部から叩くJobs等は別トークン方式にする）

### 1.3 日付・タイムゾーン
- 日付は `YYYY-MM-DD`
- JST基準で扱う

### 1.4 有効タスクの定義
- “有効タスク” = `is_active = true` かつ `archived_at is null`

### 1.5 進捗の真実（MVP）
- `achievement_percent` が真実（0〜100の整数）
- DBは `achievement_percent NOT NULL DEFAULT 0`
- `percent_before_full` は **DBにあってもMVPでは未使用**
  - APIでも返さない / 受け取らない

---

## 2. 共通レスポンス（成功/失敗）

### 2.1 エラー形式（統一）
すべてのエラーで同じ形を使う。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力が不正です",
    "fields": {
      "taskAchievements[1].percent": "percent must be an integer between 0 and 100"
    },
    "details": {}
  }
}
```

- `code`：機械判定用（フロント分岐）
- `message`：人間向け（日本語でOK）
- `fields`：フィールド単位の理由（フォーム表示用）
- `details`：配列/差分など追加情報（missingTaskIds等）

### 2.2 主なHTTPステータス
- `200 OK`：取得/更新成功
- `201 Created`：作成成功
- `204 No Content`：削除/ログアウト成功（bodyなし）
- `400 Bad Request`：入力不正
- `401 Unauthorized`：未ログイン（Cookieなし/期限切れ）
- `403 Forbidden`：他人のデータ等アクセス不可
- `404 Not Found`：存在しないID等
- `409 Conflict`：クライアント状態が古い/競合（全件送信ズレ等）

---

## 3. エンドポイント一覧（MVP）

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### Me / Settings
- `GET /me`
- `PATCH /settings`

### Tasks
- `GET /tasks?active=true|false|all`
- `POST /tasks`
- `PATCH /tasks/:id`
- `DELETE /tasks/:id`（論理削除）

### Daily
- `GET /daily?date=YYYY-MM-DD`
- `POST /daily/check`（全件送信・upsert）

### Stamps
- `POST /stamps`
- `GET /stamps/status?date=YYYY-MM-DD`

### Weekly
- `GET /weekly?week_start=YYYY-MM-DD`（7日固定、除外しない）

---

## 4. Auth

### 4.1 POST /auth/register
ユーザー登録。成功時にJWT Cookieを発行。

**Request**
```json
{ "email": "a@b.com", "password": "********" }
```

**Response 201**
- `Set-Cookie: access_token=...; HttpOnly; ...`
```json
{ "user": { "id": "uuid", "email": "a@b.com" } }
```

**Validation**
- email: 必須、メール形式
- password: 必須（最小長などは実装で決定）

---

### 4.2 POST /auth/login
ログイン。成功時にJWT Cookieを再発行。

**Request**
```json
{ "email": "a@b.com", "password": "********" }
```

**Response 200**
- `Set-Cookie: access_token=...; HttpOnly; ...`
```json
{ "user": { "id": "uuid", "email": "a@b.com" } }
```

---

### 4.3 POST /auth/logout
ログアウト。Cookieを失効。

**Response 204**
- `Set-Cookie: access_token=; Max-Age=0; Path=/; ...`

---

## 5. Me / Settings

### 5.1 GET /me
自分情報と設定を返す。

**Response 200**
```json
{
  "user": { "id": "uuid", "email": "a@b.com" },
  "settings": { "weekly_target_percent": 70, "timezone": "Asia/Tokyo", "week_start": 1 }
}
```

---

### 5.2 PATCH /settings
設定の部分更新。

**Request**
```json
{ "weekly_target_percent": 70 }
```

**Response 200**
```json
{ "settings": { "weekly_target_percent": 70, "timezone": "Asia/Tokyo", "week_start": 1 } }
```

**Validation**
- weekly_target_percent: `null` または `0..100` の整数

---

## 6. Tasks（同名OK）

### 6.1 GET /tasks?active=true|false|all
- default: `active=true`

**Response 200**
```json
{
  "tasks": [
    { "id": "uuid", "title": "英語", "weight": 3, "is_active": true, "archived_at": null }
  ]
}
```

---

### 6.2 POST /tasks

**Request**
```json
{ "title": "英語", "weight": 3, "is_active": true }
```

**Response 201**
```json
{ "task": { "id": "uuid", "title": "英語", "weight": 3, "is_active": true } }
```

**Validation**
- title: 必須（空文字NG、最大長は実装で決定）
- weight: 必須（整数、推奨1〜10 ※厳格にするかは実装で決定）
- is_active: 任意（省略時trueでもOK）

---

### 6.3 PATCH /tasks/:id

**Request（例）**
```json
{ "title": "英語学習", "weight": 4, "is_active": false }
```

**Response 200**
```json
{ "task": { "id": "uuid", "title": "英語学習", "weight": 4, "is_active": false } }
```

---

### 6.4 DELETE /tasks/:id
論理削除（archived_atを立てる）。

**Response 204**

---

## 7. Daily（今日画面）

### 7.1 GET /daily?date=YYYY-MM-DD
“その日の有効タスク”と、記録済み達成度をまとめて返す。

**Response 200（通常）**
```json
{
  "date": "2026-01-09",
  "denominator_weight": 8,
  "weighted_numerator": 1.5,
  "daily_percent": 19,
  "tasks": [
    { "taskId": "uuid", "title": "英語", "weight": 3, "achievement_percent": 0 }
  ],
  "is_no_task_day": false
}
```

**Response 200（タスク0件日）**
```json
{
  "date": "2026-01-09",
  "denominator_weight": null,
  "weighted_numerator": null,
  "daily_percent": null,
  "tasks": [],
  "is_no_task_day": true
}
```

**Notes**
- `percent_before_full` は **MVPでは返さない**
- `daily_percent` はサーバ側キャッシュ（保存のたび再計算）

---

### 7.2 POST /daily/check（全件送信）
**その日の有効タスク全件**を `taskAchievements` に入れて送る（差分禁止）。

**Request**
```json
{
  "date": "2026-01-09",
  "taskAchievements": [
    { "taskId": "uuid1", "percent": 100 },
    { "taskId": "uuid2", "percent": 0 }
  ]
}
```

**Response 200**
```json
{
  "date": "2026-01-09",
  "denominator_weight": 8,
  "weighted_numerator": 1.5,
  "daily_percent": 19
}
```

#### 7.2.1 日次計算ルール（確定）
- denominator = Σ(weight_snapshot)
- numerator = Σ(weight_snapshot × achievement_percent / 100)
- daily_percent = (numerator / denominator) × 100
- 表示は **四捨五入（round）で整数**

#### 7.2.2 バリデーション（詳細）

##### A) date
- 必須
- 形式 `YYYY-MM-DD`

**400：形式不正**
```json
{
  "error": {
    "code": "INVALID_DATE_FORMAT",
    "message": "date は YYYY-MM-DD 形式で指定してください",
    "fields": { "date": "invalid format" },
    "details": { "expected": "YYYY-MM-DD" }
  }
}
```

##### B) taskAchievements（配列）
- 必須
- 空配列はOKだが **有効タスクが0件の日のみ**
- 上限件数（任意）：例 200（防御）

**400：必須欠落**
```json
{
  "error": {
    "code": "MISSING_REQUIRED_FIELD",
    "message": "taskAchievements は必須です",
    "fields": { "taskAchievements": "required" },
    "details": {}
  }
}
```

##### C) 要素（taskId / percent）
- `taskId`: 必須、UUID形式
- `percent`: 必須、整数、0〜100
- `taskId` の重複はNG（同じtaskIdが複数出てきたらエラー）

**400：taskIdがUUIDでない**
```json
{
  "error": {
    "code": "INVALID_TASK_ID",
    "message": "taskId が不正です",
    "fields": { "taskAchievements[0].taskId": "must be a UUID" },
    "details": {}
  }
}
```

**400：percentが整数でない**
```json
{
  "error": {
    "code": "INVALID_PERCENT",
    "message": "percent は整数で指定してください",
    "fields": { "taskAchievements[1].percent": "must be an integer" },
    "details": {}
  }
}
```

**400：percentが範囲外**
```json
{
  "error": {
    "code": "PERCENT_OUT_OF_RANGE",
    "message": "percent は 0〜100 の範囲で指定してください",
    "fields": { "taskAchievements[1].percent": "out of range" },
    "details": { "min": 0, "max": 100 }
  }
}
```

**400：taskIdが重複**
```json
{
  "error": {
    "code": "DUPLICATE_TASK_ID",
    "message": "taskAchievements に同じ taskId が含まれています",
    "fields": { "taskAchievements": "duplicate taskId(s)" },
    "details": { "duplicateTaskIds": ["uuid1"] }
  }
}
```

##### D) 全件送信チェック（集合一致）
サーバは保存時点の有効タスク集合 `activeTaskIds` と、payloadの `payloadTaskIds` が **完全一致**することを要求する。

- missingTaskIds = activeTaskIds - payloadTaskIds
- extraTaskIds   = payloadTaskIds - activeTaskIds

**409：集合不一致（推奨）**
```json
{
  "error": {
    "code": "TASK_SET_MISMATCH",
    "message": "有効タスクの一覧と送信内容が一致しません。再読み込みしてから保存してください。",
    "fields": { "taskAchievements": "must include all active tasks exactly once" },
    "details": {
      "missingTaskIds": ["uuid_active_missing1", "uuid_active_missing2"],
      "extraTaskIds": ["uuid_not_active1"],
      "currentActiveTaskIds": ["uuid_active1", "uuid_active2", "uuid_active3"]
    }
  }
}
```

**フロント推奨挙動**
- `TASK_SET_MISMATCH` を受けたら `GET /daily?date=...` を再取得して再送

##### E) 所有権チェック（他人のtaskId等）
payloadに「自分のtaskではないID」が含まれる場合は弾く。

**403：所有権違反**
```json
{
  "error": {
    "code": "TASK_FORBIDDEN",
    "message": "指定された taskId にアクセスできません",
    "fields": { "taskAchievements": "contains taskId(s) not owned by user" },
    "details": { "forbiddenTaskIds": ["uuid_other_user_task"] }
  }
}
```

---

## 8. Stamps（ストリーク）

### 8.1 POST /stamps
その日のスタンプを押す。冪等（同日に複数回でも200でOK）。

**Request**
```json
{ "date": "2026-01-09" }
```

**Response 200**
```json
{ "date": "2026-01-09", "stamped": true, "streak_current": 3, "streak_best": 7 }
```

### 8.2 GET /stamps/status?date=YYYY-MM-DD
その日に押しているか確認。

**Response 200**
```json
{ "date": "2026-01-09", "stamped": true, "streak_current": 3, "streak_best": 7 }
```

---

## 9. Weekly（除外しない / 7日固定）

### 9.1 GET /weekly?week_start=YYYY-MM-DD
- 7日固定
- `daily_percent=null` の日は **週平均計算では0扱い**
- 平均は `sum(null->0) / 7` を四捨五入

**Response 200**
```json
{
  "week_start": "2026-01-06",
  "week_end": "2026-01-12",
  "days": [
    { "date": "2026-01-06", "daily_percent": 95, "is_no_task_day": false },
    { "date": "2026-01-07", "daily_percent": null, "is_no_task_day": true }
  ],
  "weekly_average": 48,
  "target_percent": 68
}
```

---

## 10. 実装メモ（サーバ側）

### 10.1 /daily/check の保存手順（推奨）
1. `activeTaskIds` をDBから取得（is_active=true & archived_at=null）
2. payloadの `taskIds` を集合化し、重複チェック
3. `missingTaskIds / extraTaskIds` を計算し、不一致なら `409 TASK_SET_MISMATCH`
4. `(user_id, date)` で `daily_checks` upsert
5. `daily_check_items` を upsert  
   - `weight_snapshot` は保存時点の tasks.weight を固定（過去保護）
6. numerator/denominator/daily_percent を再計算し  
   - `daily_checks.denominator_weight_snapshot`
   - `daily_checks.daily_percent_final`
   を更新（キャッシュ運用）
7. レスポンスを返す

### 10.2 last_active_at 更新
- ログイン時、スタンプ押下時、`POST /daily/check` 保存時に更新（MVP）
