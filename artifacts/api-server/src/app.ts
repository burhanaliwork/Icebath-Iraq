import express, { type Express } from "express";
import cors from "cors";
import session, { Store } from "express-session";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq, lt } from "drizzle-orm";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, sessionsTable } from "@workspace/db";

// ── Drizzle session store ─────────────────────────────────────────────────────
// Uses the same Drizzle db instance that's already working with Neon — no
// separate pg.Pool, no connect-pg-simple, no extra SSL configuration needed.
// The "session" table is created by drizzle-kit push which runs on every boot.
class DrizzleStore extends Store {
  // Prune expired rows once per hour
  constructor() {
    super();
    setInterval(async () => {
      try {
        await db.delete(sessionsTable).where(lt(sessionsTable.expire, new Date()));
      } catch (err) {
        logger.warn({ err }, "Session prune failed (non-fatal)");
      }
    }, 60 * 60 * 1000).unref();
  }

  get(sid: string, cb: (err: any, session?: any) => void): void {
    db.select()
      .from(sessionsTable)
      .where(eq(sessionsTable.sid, sid))
      .then(([row]) => {
        if (!row || row.expire < new Date()) return cb(null, null);
        cb(null, row.sess);
      })
      .catch((err) => {
        logger.error({ err, sid }, "Session GET error");
        cb(err);
      });
  }

  set(sid: string, session: any, cb?: (err?: any) => void): void {
    const expire =
      session.cookie?.expires instanceof Date
        ? session.cookie.expires
        : new Date(Date.now() + (session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000));

    db.insert(sessionsTable)
      .values({ sid, sess: session, expire })
      .onConflictDoUpdate({
        target: sessionsTable.sid,
        set: { sess: session, expire },
      })
      .then(() => cb?.())
      .catch((err) => {
        logger.error({ err, sid }, "Session SET error");
        cb?.(err);
      });
  }

  destroy(sid: string, cb?: (err?: any) => void): void {
    db.delete(sessionsTable)
      .where(eq(sessionsTable.sid, sid))
      .then(() => cb?.())
      .catch((err) => {
        logger.error({ err, sid }, "Session DESTROY error");
        cb?.(err);
      });
  }

  touch(sid: string, session: any, cb?: (err?: any) => void): void {
    const expire =
      session.cookie?.expires instanceof Date
        ? session.cookie.expires
        : new Date(Date.now() + (session.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000));

    db.update(sessionsTable)
      .set({ expire })
      .where(eq(sessionsTable.sid, sid))
      .then(() => cb?.())
      .catch((err) => {
        logger.warn({ err, sid }, "Session TOUCH error (non-fatal)");
        cb?.();          // don't propagate touch errors — they're non-fatal
      });
  }
}

// ── App setup ─────────────────────────────────────────────────────────────────
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
// 10 MB limit — product images are sent as base64 data-URLs inside the JSON
// body (a 800px JPEG at 0.8q is ~150–400 KB base64). Default 100 KB limit
// causes Express to reject those requests silently with 413.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const isProd = process.env["NODE_ENV"] === "production";

// Trust Back4App's reverse proxy so req.secure reflects HTTPS correctly
if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    store: new DrizzleStore(),
    secret: process.env["SESSION_SECRET"] || "fallback-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // "auto" honours X-Forwarded-Proto from the reverse proxy (trust proxy:1
      // already set above). Avoids the bug where secure:true + HTTP = browser
      // never sends the cookie back.
      secure: isProd ? "auto" : false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

logger.info("Session store: Drizzle/PostgreSQL");

app.use("/api", router);

// ── Serve built frontend in production ────────────────────────────────────────
if (isProd) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const staticPath = resolve(currentDir, "../../icebath-iraq/dist/public");
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    app.use((_req, res) => {
      res.sendFile(resolve(staticPath, "index.html"));
    });
    logger.info({ staticPath }, "Serving static frontend");
  } else {
    logger.warn({ staticPath }, "Static frontend path not found — frontend will not be served");
  }
}

export default app;
