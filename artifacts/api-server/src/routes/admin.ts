import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable, orderItemsTable, adminUsersTable, productAddonsTable } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    (req.session as any).adminId = admin.id;
    (req.session as any).adminUsername = admin.username;
    res.json({ ok: true, username: admin.username });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/admin/me", (req, res) => {
  const s = req.session as any;
  if (!s?.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({ id: s.adminId, username: s.adminUsername });
});

// ── Products ──────────────────────────────────────────────────────────────────

router.get("/admin/products", requireAdmin, async (_req, res) => {
  try {
    const products = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
    const addons = await db.select().from(productAddonsTable).orderBy(asc(productAddonsTable.sortOrder));
    const addonMap: Record<number, any[]> = {};
    for (const a of addons) {
      if (!addonMap[a.productId]) addonMap[a.productId] = [];
      addonMap[a.productId].push(a);
    }
    res.json(products.map(p => ({ ...p, addons: addonMap[p.id] ?? [] })));
  } catch (err) {
    logger.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imageUrl, inStock } = req.body;
    logger.info({ name, price, hasImage: !!imageUrl, inStock }, "Creating product");
    const [product] = await db.insert(productsTable).values({
      name,
      description: description || null,
      price: parseInt(price),
      imageUrl: imageUrl || null,
      inStock: inStock !== false,
    }).returning();
    logger.info({ productId: product.id }, "Product created");
    res.status(201).json(product);
  } catch (err) {
    logger.error({ err }, "Failed to create product");
    res.status(400).json({ error: "Failed to create product", detail: String(err) });
  }
});

router.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, imageUrl, inStock } = req.body;
    logger.info({ id, name, price, hasImage: !!imageUrl, inStock }, "Updating product");
    const [product] = await db.update(productsTable)
      .set({ name, description: description || null, price: parseInt(price), imageUrl: imageUrl || null, inStock })
      .where(eq(productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Not found" }); return; }
    logger.info({ productId: product.id }, "Product updated");
    res.json(product);
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(400).json({ error: "Failed to update product", detail: String(err) });
  }
});

// Replace all add-ons for a product (max 5)
router.put("/admin/products/:id/addons", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { addons } = req.body; // [{ name, price }]
    await db.delete(productAddonsTable).where(eq(productAddonsTable.productId, id));
    if (Array.isArray(addons) && addons.length > 0) {
      const rows = addons.slice(0, 5).map((a: any, i: number) => ({
        productId: id,
        name: String(a.name || "").trim(),
        price: parseInt(a.price) || 0,
        sortOrder: i,
      })).filter(a => a.name);
      if (rows.length) await db.insert(productAddonsTable).values(rows);
    }
    logger.info({ productId: id, count: addons?.length ?? 0 }, "Addons updated");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to update addons");
    res.status(400).json({ error: "Failed to update addons", detail: String(err) });
  }
});

router.patch("/admin/products/:id/stock", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.update(productsTable)
      .set({ inStock: req.body.inStock })
      .where(eq(productsTable.id, id)).returning();
    res.json(product);
  } catch (err) {
    logger.error({ err }, "Failed to update stock");
    res.status(400).json({ error: "Failed to update stock", detail: String(err) });
  }
});

router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productAddonsTable).where(eq(productAddonsTable.productId, id));
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(400).json({ error: "Failed to delete product", detail: String(err) });
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────

router.get("/admin/orders", requireAdmin, async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      return { ...order, items };
    }));
    res.json(ordersWithItems);
  } catch (err) {
    logger.error({ err }, "Failed to fetch orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const [order] = await db.update(ordersTable)
      .set({ status: req.body.status })
      .where(eq(ordersTable.id, parseInt(req.params.id))).returning();
    res.json(order);
  } catch (err) {
    logger.error({ err }, "Failed to update order");
    res.status(400).json({ error: "Failed to update order", detail: String(err) });
  }
});

export default router;
