import { Router } from "express";
import { pool } from "../db";
import { stampSchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ========================================
// POST /api/stamps - スタンプを押す（冪等）
// ========================================
// 冪等 = 同じ日に何回押しても結果は同じ（エラーにならない）
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = stampSchema.safeParse(req.body);
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "INVALID_DATE_FORMAT",
      message: "date は YYYY-MM-DD 形式で指定してください",
      fields: zodErrorToFields(parsed.error),
      details: { expected: "YYYY-MM-DD" },
    });
  }

  const { date } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2. スタンプ挿入（ON CONFLICT で冪等性を担保）
    await client.query(
      `INSERT INTO daily_stamps (user_id, date, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, date) DO NOTHING`,
      [userId, date]
    );

    // 3. ストリークキャッシュを取得 or 初期化
    const cacheResult = await client.query(
      `SELECT streak_current, streak_best, streak_last_date
       FROM user_streak_cache
       WHERE user_id = $1`,
      [userId]
    );

    let streakCurrent = 0;
    let streakBest = 0;
    let streakLastDate: string | null = null;

    if (cacheResult.rows.length > 0) {
      streakCurrent = cacheResult.rows[0].streak_current;
      streakBest = cacheResult.rows[0].streak_best;
      streakLastDate = cacheResult.rows[0].streak_last_date;
    }

    // 4. ストリーク計算
    // - 昨日押してた → streak_current + 1
    // - 今日既に押してた → 変更なし
    // - それ以外 → streak_current = 1（リセット）
    const today = new Date(date);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (streakLastDate === date) {
      // 今日既に押してる → 何もしない
    } else if (streakLastDate === yesterdayStr) {
      // 昨日押してた → 継続
      streakCurrent += 1;
    } else {
      // それ以外 → リセット
      streakCurrent = 1;
    }

    // ベスト更新
    if (streakCurrent > streakBest) {
      streakBest = streakCurrent;
    }

    // 5. ストリークキャッシュを更新（upsert）
    await client.query(
      `INSERT INTO user_streak_cache (user_id, streak_current, streak_best, streak_last_date, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         streak_current = $2,
         streak_best = $3,
         streak_last_date = $4,
         updated_at = NOW()`,
      [userId, streakCurrent, streakBest, date]
    );

    // 6. last_active_at 更新（仕様書: スタンプ押下時に更新）
    await client.query(
      `UPDATE users SET last_active_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");

    // 7. レスポンス
    res.status(200).json({
      date,
      stamped: true,
      streak_current: streakCurrent,
      streak_best: streakBest,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Stamp error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  } finally {
    client.release();
  }
});

// ========================================
// GET /api/stamps/status - スタンプ状態確認
// ========================================
router.get("/status", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;
  const date = req.query.date as string;

  // 1. バリデーション
  const parsed = stampSchema.safeParse({ date });
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "INVALID_DATE_FORMAT",
      message: "date は YYYY-MM-DD 形式で指定してください",
      fields: zodErrorToFields(parsed.error),
      details: { expected: "YYYY-MM-DD" },
    });
  }

  try {
    // 2. スタンプ存在チェック
    const stampResult = await pool.query(
      `SELECT 1 FROM daily_stamps WHERE user_id = $1 AND date = $2`,
      [userId, date]
    );
    const stamped = stampResult.rows.length > 0;

    // 3. ストリーク取得
    const cacheResult = await pool.query(
      `SELECT streak_current, streak_best
       FROM user_streak_cache
       WHERE user_id = $1`,
      [userId]
    );

    let streakCurrent = 0;
    let streakBest = 0;
    if (cacheResult.rows.length > 0) {
      streakCurrent = cacheResult.rows[0].streak_current;
      streakBest = cacheResult.rows[0].streak_best;
    }

    // 4. レスポンス
    res.status(200).json({
      date,
      stamped,
      streak_current: streakCurrent,
      streak_best: streakBest,
    });
  } catch (err) {
    console.error("Stamp status error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

export default router;
