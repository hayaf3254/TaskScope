import { Response } from "express";
import type { ZodError } from "zod";

interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  details?: Record<string, unknown>;
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

export function zodErrorToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    fields[path] = issue.message;
  }
  return fields;
}
