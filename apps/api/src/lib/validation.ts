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

// ========== Stamps ==========
// YYYY-MM-DD 形式を正規表現でチェック
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で指定してください");

export const stampSchema = z.object({
  date: dateStringSchema,
});

export type StampInput = z.infer<typeof stampSchema>;
