import { Response } from "express";
import type { ZodError } from "zod";

interface ApiError {
  code: string; //エラーの種類を表す文字列
  message: string; //人間が読むエラーの説明
  fields?: Record<string, string>; //どのフィールドのミスか
  details?: Record<string, unknown>; //追加情報
}

export function errorResponse(
  res: Response,
  status: number,
  error: ApiError
): Response {
  return res.status(status).json({
    error: {
      code: error.code,
      message: error.message,
      fields: error.fields ?? {},
      details: error.details ?? {},
    },
  });
}
//?? = 「左がnull/undefinedなら右を使う」演算子

//ZodErrorを errorResponse の fields に渡せる形に変換
export function zodErrorToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    fields[path] = issue.message;
  }
  return fields;
}
