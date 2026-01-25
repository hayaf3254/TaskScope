import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});

export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ========== Common ==========
// YYYY-MM-DD 形式を正規表現でチェック
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で指定してください");

// UUID形式チェック
const uuidSchema = z.string().uuid("taskId は UUID 形式で指定してください");

// ========== Stamps ==========
export const stampSchema = z.object({
  date: dateStringSchema,
});

export type StampInput = z.infer<typeof stampSchema>;

// ========== Daily ==========
export const dailyGetSchema = z.object({
  date: dateStringSchema,
});

export type DailyGetInput = z.infer<typeof dailyGetSchema>;

// POST /daily/check 用
const taskAchievementSchema = z.object({
  taskId: uuidSchema,
  percent: z
    .number()
    .int("percent は整数で指定してください")
    .min(0, "percent は 0〜100 の範囲で指定してください")
    .max(100, "percent は 0〜100 の範囲で指定してください"),
});

export const dailyCheckSchema = z.object({
  date: dateStringSchema,
  taskAchievements: z.array(taskAchievementSchema),
});

export type DailyCheckInput = z.infer<typeof dailyCheckSchema>;
