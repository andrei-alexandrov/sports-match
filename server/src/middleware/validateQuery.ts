import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors";

/**
 * Query-param twin of validate(): Express 5 exposes req.query through a
 * read-only getter, so the parsed result goes to res.locals.query instead.
 */
export function validateQuery(schema: ZodType): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Invalid input"));
      return;
    }
    res.locals.query = result.data;
    next();
  };
}
