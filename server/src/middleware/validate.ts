import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors";

export function validate(schema: ZodType): (req: Request, res: Response, next: NextFunction) => void {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid input"));
      return;
    }
    req.body = result.data;
    next();
  };
}
