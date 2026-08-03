import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    // Log 4xx as warn, 5xx as error so they stand out in Back4App log stream
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
// 10 MB limit — needed because product images are sent as base64 data-URLs
// inside the JSON body (a 800px JPEG at 0.8q is ~150–400 KB base64).
// The default 100 KB limit causes Express to reject those requests with 413
// before the route handler runs, which produces a silent failure.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const isProd = process.env["NODE_ENV"] === "production";

// Trust Back4App / Northflank / Render / any reverse-proxy one hop away so that:
//  - req.secure is true (needed for Secure cookies over HTTPS)
//  - req.ip reflects the real client IP, not the proxy IP
if (isProd) {
  app.set("trust proxy", 1);
}

// ── Session store ─────────────────────────────────────────────────────────────
// Use PostgreSQL to persist sessions so they survive container restarts.
// Falls back to MemoryStore only when DATABASE_URL is not set (local dev without DB).
const PgSession = ConnectPgSimple(session);

// Re-use the already-configured pg.Pool from @workspace/db.
// That pool already has rejectUnauthorized:false for Neon SSL — no need to
// duplicate the config here. Passing pool= directly avoids the bug where
// connect-pg-simple's internal pool ignores SSL and silently falls back to
// MemoryStore when the Neon TLS handshake fails.
const sessionStore = new PgSession({
  pool,
  createTableIfMissing: true,   // creates "session" table on first boot
  pruneSessionInterval: 60 * 60, // prune expired rows every hour
});

logger.info("Session store: PostgreSQL (connect-pg-simple)");

app.use(
  session({
    store: sessionStore,
    secret: process.env["SESSION_SECRET"] || "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // In production, trust the X-Forwarded-Proto header set by the reverse proxy.
      // "auto" means: secure if req.secure is true (which trust-proxy makes true over HTTPS).
      // This avoids the bug where secure:true + HTTP access = browser never sends the cookie.
      secure: isProd ? "auto" : false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

// ── Serve built frontend in production ────────────────────────────────────────
// In development Vite's dev server handles the frontend.
// On Render the frontend is pre-built; the API server serves it directly.
if (isProd) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // After esbuild: currentDir = artifacts/api-server/dist/
  // Frontend build:             artifacts/icebath-iraq/dist/public/
  const staticPath = resolve(currentDir, "../../icebath-iraq/dist/public");
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    // Any non-API route falls through to index.html
    app.use((_req, res) => {
      res.sendFile(resolve(staticPath, "index.html"));
    });
    logger.info({ staticPath }, "Serving static frontend");
  } else {
    logger.warn({ staticPath }, "Static frontend path not found — frontend will not be served");
  }
}

export default app;
