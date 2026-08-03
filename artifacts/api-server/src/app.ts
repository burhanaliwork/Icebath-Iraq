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

const app: Express = express();

app.use(
  pinoHttp({
    logger,
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

const sessionStore = process.env["DATABASE_URL"]
  ? new PgSession({
      conString: process.env["DATABASE_URL"],
      // connect-pg-simple creates the "session" table automatically on first use
      // if it doesn't already exist (createTableIfMissing: true).
      createTableIfMissing: true,
      // Prune expired sessions every hour
      pruneSessionInterval: 60 * 60,
      // Use SSL in production (same config as the main DB pool)
      pool: undefined, // let it create its own pool from conString
    })
  : undefined;

if (isProd && !sessionStore) {
  logger.warn("DATABASE_URL not set — sessions will use MemoryStore and be lost on restart");
}

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
