import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable, orderItemsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/products", async (_req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
    res.json(products);
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(product);
  } catch {
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
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      }))
    );
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

export default router;
