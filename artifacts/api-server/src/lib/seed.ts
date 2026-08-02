import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function seedAdmin() {
  try {
    const existing = await db.select().from(adminUsersTable).limit(1);
    if (existing.length === 0) {
      const hash = await bcrypt.hash("icebath2024", 12);
      await db.insert(adminUsersTable).values({ username: "admin", passwordHash: hash });
      logger.info("Default admin created — username: admin, password: icebath2024");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}
