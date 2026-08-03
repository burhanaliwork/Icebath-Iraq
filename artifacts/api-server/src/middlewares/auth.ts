import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session?.adminId) {
    logger.warn(
      { method: req.method, url: req.url, sessionId: req.session?.id ?? "none" },
      "Admin auth failed — no session"
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
