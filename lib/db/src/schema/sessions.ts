import { pgTable, varchar, json, timestamp, index } from "drizzle-orm/pg-core";

// Persistent session storage for express-session.
// Matches the column layout used by connect-pg-simple so a migration isn't
// needed if you ever want to switch back. The table is created automatically
// by drizzle-kit push which runs on every container start.
export const sessionsTable = pgTable(
  "session",
  {
    sid:    varchar("sid").primaryKey(),
    sess:   json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (t) => [index("IDX_session_expire").on(t.expire)],
);
