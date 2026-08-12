import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Neon (and most hosted Postgres providers) require SSL in production.
// rejectUnauthorized: false accepts Neon's self-signed / intermediate cert
// without needing to bundle a CA cert in the container image.
// In development (local Postgres) SSL is left off to avoid connection errors.
const sslConfig =
  process.env.NODE_ENV === "production"
    ? { ssl: { rejectUnauthorized: false } }
    : {};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...sslConfig,
  // Keep the pool intentionally small: this app has a very low request volume.
  // Explicit timeouts prevent idle clients from lingering against Neon.
  max: 3,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
  maxLifetimeSeconds: 300,
  allowExitOnIdle: true,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
