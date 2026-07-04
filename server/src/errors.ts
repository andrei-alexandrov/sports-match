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
  // Body-parser and similar client faults carry a 4xx status (e.g. malformed
  // JSON, oversized body) — report them as such, without log noise.
  if (typeof err === "object" && err !== null) {
    const maybe = err as { status?: unknown; statusCode?: unknown };
    const status =
      typeof maybe.status === "number" ? maybe.status
      : typeof maybe.statusCode === "number" ? maybe.statusCode
      : undefined;
    if (status !== undefined && status >= 400 && status < 500) {
      const code = status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST";
      const message = status === 413 ? "Request body too large" : "Malformed request body";
      res.status(status).json({ error: { code, message } });
      return;
    }
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
