import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId: string;
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const cookieName = process.env.COOKIE_NAME || "taskscope_jwt";
  const jwtSecret = process.env.JWT_SECRET!;

  const token = req.cookies?.[cookieName];

  if (!token) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "認証が必要です",
        fields: {},
        details: {},
      },
    });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: string };
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "認証トークンが無効または期限切れです",
        fields: {},
        details: {},
      },
    });
  }
}
