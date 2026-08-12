import app from "./app";
import { logger } from "./lib/logger";
import { seedAdmin } from "./lib/seed";
import { pool } from "@workspace/db";

// PORT is injected by Back4App / Render / any container host.
// Default to 8080 so the container doesn't crash during local testing
// when PORT is not set in the environment.
const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind to 0.0.0.0 so the server is reachable inside Docker / containers.
// Binding to localhost or 127.0.0.1 would make the port unreachable from outside.
const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, host: "0.0.0.0" }, "Server listening");
  // Seed default admin user on first run
  seedAdmin();
});

server.on("error", (err) => {
  logger.error({ err }, "Server failed to start");
  process.exit(1);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down API server");
  server.close(async () => {
    try {
      await pool.end();
      logger.info("PostgreSQL pool closed");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Failed to close PostgreSQL pool");
      process.exit(1);
    }
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
