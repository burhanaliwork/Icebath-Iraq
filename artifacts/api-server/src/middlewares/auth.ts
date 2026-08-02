import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = req.session as any;
  if (!session?.adminId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
