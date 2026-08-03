import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  imageUrl: text("image_url"),
  inStock: boolean("in_stock").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Optional add-ons per product (max 5, enforced in API layer)
export const productAddonsTable = pgTable("product_addons", {
  id:        serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  name:      text("name").notNull(),
  price:     integer("price").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
export type ProductAddon = typeof productAddonsTable.$inferSelect;
