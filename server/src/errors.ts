import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Mongo duplicate-key race (two simultaneous registers with one username).
  if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000) {
    res.status(409).json({ error: { code: "USERNAME_TAKEN", message: "Username already exists" } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
