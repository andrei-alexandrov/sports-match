import path from "node:path";
import express from "express";

const PASS_THROUGH_PREFIXES = ["/api", "/socket.io"];

function isReservedPath(pathname: string): boolean {
  return PASS_THROUGH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Serves the built SPA next to the API: static assets first, then an
 * index.html fallback so client-side routes survive a hard refresh.
 * Must be registered before the JSON 404/error handlers; API and socket
 * paths fall through to them untouched.
 */
export function serveClient(app: express.Express, distPath: string): void {
  const indexFile = path.resolve(distPath, "index.html");
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== "GET" || isReservedPath(req.path)) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });
}
