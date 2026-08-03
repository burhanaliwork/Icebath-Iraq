import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable, orderItemsTable, productAddonsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Helper: fetch addons grouped by productId
async function getAddonMap(): Promise<Record<number, any[]>> {
  const addons = await db.select().from(productAddonsTable).orderBy(asc(productAddonsTable.sortOrder));
  const map: Record<number, any[]> = {};
  for (const a of addons) {
    if (!map[a.productId]) map[a.productId] = [];
    map[a.productId].push(a);
  }
  return map;
}

router.get("/products", async (_req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
    const addonMap = await getAddonMap();
    res.json(products.map(p => ({ ...p, addons: addonMap[p.id] ?? [] })));
  } catch (err) {
    logger.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    const addons = await db.select().from(productAddonsTable)
      .where(eq(productAddonsTable.productId, id))
      .orderBy(asc(productAddonsTable.sortOrder));
    res.json({ ...product, addons });
  } catch (err) {
    logger.error({ err }, "Failed to fetch product");
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items, notes } = req.body;
    if (!customerName || !customerPhone || !customerAddress || !items?.length) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const total = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const [order] = await db.insert(ordersTable).values({
      customerName, customerPhone, customerAddress, total, notes: notes || null,
    }).returning();
    await db.insert(orderItemsTable).values(
      items.map((item: any) => ({
        orderId: order.id,
        productId: item.productId ?? 0,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      }))
    );
    res.status(201).json(order);
  } catch (err) {
    logger.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

export default router;
