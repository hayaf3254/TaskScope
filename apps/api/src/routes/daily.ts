import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { dailyGetSchema, dailyCheckSchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

// TODO: リファクタ候補
// - 行102-148: バリデーションエラー分岐を共通関数化
// - 行186-210: daily_check_items の bulk upsert (1クエリ化)
// - 行212-228: daily_percent計算をGET側(行79-87)と共通化

const router = Router();

// ========================================
// GET /api/daily?date=YYYY-MM-DD
// ========================================
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = dailyGetSchema.safeParse({ date: req.query.date });
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "INVALID_DATE_FORMAT",
      message: "date は YYYY-MM-DD 形式で指定してください",
      fields: zodErrorToFields(parsed.error),
      details: { expected: "YYYY-MM-DD" },
    });
  }

  const { date } = parsed.data;

  try {
    // 2. 有効タスク一覧を取得（is_active=true AND archived_at IS NULL）
    const tasksResult = await pool.query(
      `SELECT id, title, weight
       FROM tasks
       WHERE user_id = $1 AND is_active = true AND archived_at IS NULL
       ORDER BY created_at ASC`,
      [userId]
    );
    const activeTasks = tasksResult.rows;

    // 3. タスク0件の場合
    if (activeTasks.length === 0) {
      return res.status(200).json({
        date,
        denominator_weight: null,
        weighted_numerator: null,
        daily_percent: null,
        tasks: [],
        is_no_task_day: true,
      });
    }

    // 4. 該当日のdaily_checkを取得
    const dailyCheckResult = await pool.query(
      `SELECT id FROM daily_checks WHERE user_id = $1 AND date = $2`,
      [userId, date]
    );

    // 5. daily_check_itemsから達成度を取得
    const achievementMap = new Map<string, number>();
    if (dailyCheckResult.rows.length > 0) {
      const dailyCheckId = dailyCheckResult.rows[0].id;
      const itemsResult = await pool.query(
        `SELECT task_id, achievement_percent
         FROM daily_check_items
         WHERE daily_check_id = $1`,
        [dailyCheckId]
      );
      for (const row of itemsResult.rows) {
        achievementMap.set(row.task_id, row.achievement_percent);
      }
    }

    // 6. タスク一覧にachievement_percentを付与
    const tasks = activeTasks.map((t) => ({
      taskId: t.id,
      title: t.title,
      weight: t.weight,
      achievement_percent: achievementMap.get(t.id) ?? 0,
    }));

    // 7. 集計計算
    const denominatorWeight = tasks.reduce((sum, t) => sum + t.weight, 0);
    const weightedNumerator = tasks.reduce(
      (sum, t) => sum + (t.weight * t.achievement_percent) / 100,
      0
    );
    const dailyPercent =
      denominatorWeight > 0
        ? Math.round((weightedNumerator / denominatorWeight) * 100)
        : 0;

    // 8. レスポンス
    res.status(200).json({
      date,
      denominator_weight: denominatorWeight,
      weighted_numerator: weightedNumerator,
      daily_percent: dailyPercent,
      tasks,
      is_no_task_day: false,
    });
  } catch (err) {
    console.error("Daily get error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// ========================================
// POST /api/daily/check - 日次チェック保存（全件送信）
// ========================================
router.post("/check", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = dailyCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    // エラーの種類を判定
    const issues = parsed.error.issues;
    const firstIssue = issues[0];
    const path = firstIssue?.path.join(".") || "";

    // dateの形式エラー
    if (path === "date") {
      return errorResponse(res, 400, {
        code: "INVALID_DATE_FORMAT",
        message: "date は YYYY-MM-DD 形式で指定してください",
        fields: zodErrorToFields(parsed.error),
        details: { expected: "YYYY-MM-DD" },
      });
    }

    // taskAchievements欠落
    if (path === "taskAchievements" && firstIssue?.code === "invalid_type") {
      return errorResponse(res, 400, {
        code: "MISSING_REQUIRED_FIELD",
        message: "taskAchievements は必須です",
        fields: { taskAchievements: "required" },
        details: {},
      });
    }

    // taskIdの形式エラー
    if (path.includes("taskId")) {
      return errorResponse(res, 400, {
        code: "INVALID_TASK_ID",
        message: "taskId が不正です",
        fields: zodErrorToFields(parsed.error),
        details: {},
      });
    }

    // percentの形式エラー
    if (path.includes("percent")) {
      const isRangeError =
        firstIssue?.code === "too_small" || firstIssue?.code === "too_big";
      return errorResponse(res, 400, {
        code: isRangeError ? "PERCENT_OUT_OF_RANGE" : "INVALID_PERCENT",
        message: isRangeError
          ? "percent は 0〜100 の範囲で指定してください"
          : "percent は整数で指定してください",
        fields: zodErrorToFields(parsed.error),
        details: isRangeError ? { min: 0, max: 100 } : {},
      });
    }

    // その他のバリデーションエラー
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力が不正です",
      fields: zodErrorToFields(parsed.error),
      details: {},
    });
  }

  const { date, taskAchievements } = parsed.data;

  // 2. taskId重複チェック
  const taskIdSet = new Set<string>();
  const duplicateTaskIds: string[] = [];
  for (const item of taskAchievements) {
    if (taskIdSet.has(item.taskId)) {
      duplicateTaskIds.push(item.taskId);
    }
    taskIdSet.add(item.taskId);
  }
  if (duplicateTaskIds.length > 0) {
    return errorResponse(res, 400, {
      code: "DUPLICATE_TASK_ID",
      message: "taskAchievements に同じ taskId が含まれています",
      fields: { taskAchievements: "duplicate taskId(s)" },
      details: { duplicateTaskIds },
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 3. 有効タスク一覧を取得
    const activeTasksResult = await client.query(
      `SELECT id, weight FROM tasks
       WHERE user_id = $1 AND is_active = true AND archived_at IS NULL`,
      [userId]
    );
    const activeTasks = activeTasksResult.rows;
    const activeTaskIds = new Set(activeTasks.map((t) => t.id));
    const activeTaskWeightMap = new Map(activeTasks.map((t) => [t.id, t.weight]));

    // 4. 所有権チェック（payloadにあるtaskIdが自分のものか）
    const payloadTaskIds = new Set(taskAchievements.map((a) => a.taskId));

    // 所有権チェック: payloadにあるtaskIdがDBに存在するか確認
    if (payloadTaskIds.size > 0) {
      const ownedTasksResult = await client.query(
        `SELECT id FROM tasks WHERE user_id = $1 AND id = ANY($2)`,
        [userId, Array.from(payloadTaskIds)]
      );
      const ownedTaskIds = new Set(ownedTasksResult.rows.map((r) => r.id));
      const forbiddenTaskIds = Array.from(payloadTaskIds).filter(
        (id) => !ownedTaskIds.has(id)
      );
      if (forbiddenTaskIds.length > 0) {
        await client.query("ROLLBACK");
        return errorResponse(res, 403, {
          code: "TASK_FORBIDDEN",
          message: "指定された taskId にアクセスできません",
          fields: { taskAchievements: "contains taskId(s) not owned by user" },
          details: { forbiddenTaskIds },
        });
      }
    }

    // 5. 集合一致チェック（有効タスク = payload）
    const missingTaskIds = Array.from(activeTaskIds).filter(
      (id) => !payloadTaskIds.has(id)
    );
    const extraTaskIds = Array.from(payloadTaskIds).filter(
      (id) => !activeTaskIds.has(id)
    );

    if (missingTaskIds.length > 0 || extraTaskIds.length > 0) {
      await client.query("ROLLBACK");
      return errorResponse(res, 409, {
        code: "TASK_SET_MISMATCH",
        message:
          "有効タスクの一覧と送信内容が一致しません。再読み込みしてから保存してください。",
        fields: {
          taskAchievements: "must include all active tasks exactly once",
        },
        details: {
          missingTaskIds,
          extraTaskIds,
          currentActiveTaskIds: Array.from(activeTaskIds),
        },
      });
    }

    // 6. daily_checks upsert
    const dailyCheckUpsertResult = await client.query(
      `INSERT INTO daily_checks (id, user_id, date, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (user_id, date) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [uuidv4(), userId, date]
    );
    const dailyCheckId = dailyCheckUpsertResult.rows[0].id;

    // 7. daily_check_items upsert
    for (const item of taskAchievements) {
      const weight = activeTaskWeightMap.get(item.taskId) ?? 1;
      await client.query(
        `INSERT INTO daily_check_items (id, daily_check_id, task_id, achievement_percent, weight_snapshot, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (daily_check_id, task_id) DO UPDATE SET
           achievement_percent = $4,
           weight_snapshot = $5,
           updated_at = NOW()`,
        [uuidv4(), dailyCheckId, item.taskId, item.percent, weight]
      );
    }

    // 8. daily_percent計算
    const denominatorWeight = taskAchievements.reduce(
      (sum, item) => sum + (activeTaskWeightMap.get(item.taskId) ?? 1),
      0
    );
    const weightedNumerator = taskAchievements.reduce(
      (sum, item) =>
        sum + ((activeTaskWeightMap.get(item.taskId) ?? 1) * item.percent) / 100,
      0
    );
    const dailyPercent =
      denominatorWeight > 0
        ? Math.round((weightedNumerator / denominatorWeight) * 100)
        : 0;

    // 9. daily_checksキャッシュ更新
    await client.query(
      `UPDATE daily_checks
       SET denominator_weight_snapshot = $1, daily_percent_final = $2, updated_at = NOW()
       WHERE id = $3`,
      [denominatorWeight, dailyPercent, dailyCheckId]
    );

    // 10. last_active_at更新（仕様書: POST /daily/check保存時に更新）
    await client.query(
      `UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");

    // 11. レスポンス
    res.status(200).json({
      date,
      denominator_weight: denominatorWeight,
      weighted_numerator: weightedNumerator,
      daily_percent: dailyPercent,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Daily check error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  } finally {
    client.release();
  }
});

export default router;
