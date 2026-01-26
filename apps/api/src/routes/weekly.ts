import { Router } from "express";
import { pool } from "../db";
import { weeklyGetSchema } from "../lib/validation";
import { errorResponse, zodErrorToFields } from "../lib/errors";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ========================================
// GET /api/weekly?week_start=YYYY-MM-DD
// ========================================
router.get("/", requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).userId;

  // 1. バリデーション
  const parsed = weeklyGetSchema.safeParse({ week_start: req.query.week_start });
  if (!parsed.success) {
    return errorResponse(res, 400, {
      code: "INVALID_DATE_FORMAT",
      message: "week_start は YYYY-MM-DD 形式で指定してください",
      fields: zodErrorToFields(parsed.error),
      details: { expected: "YYYY-MM-DD" },
    });
  }

  const { week_start } = parsed.data;

  try {
    // 2. week_end を計算（week_start + 6日）
    const startDate = new Date(week_start);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const week_end = endDate.toISOString().split("T")[0];

    // 3. 7日分の日付リストを生成
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // 4. daily_checks から該当期間のデータを取得
    const dailyChecksResult = await pool.query(
      `SELECT date, daily_percent_final, denominator_weight_snapshot
       FROM daily_checks
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [userId, week_start, week_end]
    );

    // 日付をキーにしたマップを作成
    const dailyCheckMap = new Map<
      string,
      { daily_percent: number | null; denominator_weight: number | null }
    >();
    for (const row of dailyChecksResult.rows) {
      const dateStr =
        row.date instanceof Date
          ? row.date.toISOString().split("T")[0]
          : String(row.date);
      dailyCheckMap.set(dateStr, {
        daily_percent: row.daily_percent_final,
        denominator_weight: row.denominator_weight_snapshot,
      });
    }

    // 5. 7日分のデータを構築
    const days = dates.map((date) => {
      const data = dailyCheckMap.get(date);
      if (!data) {
        // レコードなし = タスク未設定または未入力
        return {
          date,
          daily_percent: null,
          is_no_task_day: true,
        };
      }

      // denominator_weight が null または 0 の場合は no_task_day
      const isNoTaskDay =
        data.denominator_weight === null || data.denominator_weight === 0;

      return {
        date,
        daily_percent: data.daily_percent,
        is_no_task_day: isNoTaskDay,
      };
    });

    // 6. weekly_average 計算（null は 0 扱い、7日で割る）
    const sum = days.reduce((acc, day) => acc + (day.daily_percent ?? 0), 0);
    const weekly_average = Math.round(sum / 7);

    // 7. target_percent を user_settings から取得
    const settingsResult = await pool.query(
      `SELECT weekly_target_percent FROM user_settings WHERE user_id = $1`,
      [userId]
    );
    const target_percent =
      settingsResult.rows.length > 0
        ? settingsResult.rows[0].weekly_target_percent
        : null;

    // 8. レスポンス
    res.status(200).json({
      week_start,
      week_end,
      days,
      weekly_average,
      target_percent,
    });
  } catch (err) {
    console.error("Weekly get error:", err);
    return errorResponse(res, 500, {
      code: "INTERNAL_ERROR",
      message: "サーバーエラーが発生しました",
    });
  }
});

export default router;
