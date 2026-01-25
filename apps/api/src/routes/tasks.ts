import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { taskCreateSchema, taskUpdateSchema, taskQuerySchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ========================================
// GET /api/tasks?active=true|false|all
// ========================================
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. クエリパラメータのバリデーション
  const parsed = taskQuerySchema.safeParse({ active: req.query.active });
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "クエリパラメータが不正です",
      fields: zodErrorToFields(parsed.error),
    });
  }

  const { active } = parsed.data;

  try {
    // 2. クエリ構築
    let query = `
      SELECT id, title, weight, is_active, archived_at
      FROM tasks
      WHERE user_id = $1
    `;
    const params: (string | boolean | null)[] = [userId];

    if (active === "true") {
      // 有効タスク = is_active=true AND archived_at IS NULL
      query += ` AND is_active = true AND archived_at IS NULL`;
    } else if (active === "false") {
      // 非アクティブ = is_active=false OR archived_at IS NOT NULL
      query += ` AND (is_active = false OR archived_at IS NOT NULL)`;
    }
    // active === "all" の場合は条件追加なし

    query += ` ORDER BY created_at ASC`;

    // 3. 実行
    const result = await pool.query(query, params);

    // 4. レスポンス
    res.status(200).json({
      tasks: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        weight: row.weight,
        is_active: row.is_active,
        archived_at: row.archived_at,
      })),
    });
  } catch (err) {
    console.error("Tasks get error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// ========================================
// POST /api/tasks - タスク作成
// ========================================
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = taskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力が不正です",
      fields: zodErrorToFields(parsed.error),
    });
  }

  const { title, weight, is_active } = parsed.data;

  try {
    // 2. 挿入
    const taskId = uuidv4();
    const result = await pool.query(
      `INSERT INTO tasks (id, user_id, title, weight, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, title, weight, is_active`,
      [taskId, userId, title, weight, is_active]
    );

    // 3. レスポンス
    res.status(201).json({
      task: result.rows[0],
    });
  } catch (err) {
    console.error("Task create error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// ========================================
// PATCH /api/tasks/:id - タスク更新
// ========================================
router.patch("/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const taskId = req.params.id as string;

  // 1. UUID形式チェック
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return errorResponse(res, 400, {
      code: "INVALID_TASK_ID",
      message: "タスクIDが不正です",
      fields: { id: "must be a UUID" },
    });
  }

  // 2. バリデーション
  const parsed = taskUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力が不正です",
      fields: zodErrorToFields(parsed.error),
    });
  }

  const updates = parsed.data;

  // 更新するフィールドがない場合
  if (Object.keys(updates).length === 0) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "更新するフィールドを指定してください",
      fields: {},
    });
  }

  try {
    // 3. タスク存在・所有権チェック
    const existResult = await pool.query(
      `SELECT id FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    if (existResult.rows.length === 0) {
      return errorResponse(res, 404, {
        code: "TASK_NOT_FOUND",
        message: "タスクが見つかりません",
      });
    }

    // 4. 動的UPDATE構築
    const setClauses: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.weight !== undefined) {
      setClauses.push(`weight = $${paramIndex++}`);
      values.push(updates.weight);
    }
    if (updates.is_active !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }
    setClauses.push(`updated_at = NOW()`);

    values.push(taskId);
    values.push(userId);

    const query = `
      UPDATE tasks
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING id, title, weight, is_active
    `;

    // 5. 実行
    const result = await pool.query(query, values);

    // 6. レスポンス
    res.status(200).json({
      task: result.rows[0],
    });
  } catch (err) {
    console.error("Task update error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

// ========================================
// DELETE /api/tasks/:id - タスク削除（論理削除）
// ========================================
router.delete("/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const taskId = req.params.id as string;

  // 1. UUID形式チェック
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(taskId)) {
    return errorResponse(res, 400, {
      code: "INVALID_TASK_ID",
      message: "タスクIDが不正です",
      fields: { id: "must be a UUID" },
    });
  }

  try {
    // 2. タスク存在・所有権チェック
    const existResult = await pool.query(
      `SELECT id, archived_at FROM tasks WHERE id = $1 AND user_id = $2`,
      [taskId, userId]
    );
    if (existResult.rows.length === 0) {
      return errorResponse(res, 404, {
        code: "TASK_NOT_FOUND",
        message: "タスクが見つかりません",
      });
    }

    // 既にアーカイブ済みの場合も204を返す（冪等性）
    if (existResult.rows[0].archived_at !== null) {
      return res.status(204).send();
    }

    // 3. 論理削除（archived_at を立てる）
    await pool.query(
      `UPDATE tasks SET archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    // 4. レスポンス
    res.status(204).send();
  } catch (err) {
    console.error("Task delete error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

export default router;
