import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    next(new AppError(401, "UNAUTHORIZED", "You must be logged in"));
    return;
  }
  next();
}
