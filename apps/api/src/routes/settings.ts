import { Router } from "express";
import { pool } from "../db";
import { settingsUpdateSchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ========================================
// PATCH /api/settings - 設定の部分更新
// ========================================
router.patch("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = settingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "VALIDATION_ERROR",
      message: "入力が不正です",
      fields: zodErrorToFields(parsed.error),
      details: {},
    });
  }

  const { weekly_target_percent } = parsed.data;

  try {
    // 2. user_settings を upsert
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, weekly_target_percent, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         weekly_target_percent = COALESCE($2, user_settings.weekly_target_percent),
         updated_at = NOW()
       RETURNING weekly_target_percent, timezone, week_start`,
      [userId, weekly_target_percent ?? null]
    );

    const settings = result.rows[0];

    // 3. レスポンス
    res.status(200).json({
      settings: {
        weekly_target_percent: settings.weekly_target_percent,
        timezone: settings.timezone,
        week_start: settings.week_start,
      },
    });
  } catch (err) {
    console.error("Settings update error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

export default router;
