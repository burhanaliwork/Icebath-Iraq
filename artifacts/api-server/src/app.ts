import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env["NODE_ENV"] === "production";

// Trust Northflank / Render / any reverse-proxy one hop away so that:
//  - req.secure is true (needed for Secure cookies over HTTPS)
//  - req.ip reflects the real client IP, not the proxy IP
if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: process.env["SESSION_SECRET"] || "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,           // true on Render (HTTPS), false in local dev
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
    app.get("*", (_req, res) => {
      res.sendFile(resolve(staticPath, "index.html"));
    });
    logger.info({ staticPath }, "Serving static frontend");
  } else {
    logger.warn({ staticPath }, "Static frontend path not found — frontend will not be served");
  }
}

export default app;
