import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const jwtSecret = () => process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "trustlens-development-secret";

export type AuthenticatedRequest = Request & {
  userId?: number;
};

export function createToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, jwtSecret(), { expiresIn: "7d" });
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret());
    if (typeof payload !== "object" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      res.status(401).json({ error: "Invalid authentication token" });
      return;
    }
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired authentication token" });
  }
}

export function requireUserId(req: AuthenticatedRequest, res: Response): number | null {
  if (!req.userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return req.userId;
}