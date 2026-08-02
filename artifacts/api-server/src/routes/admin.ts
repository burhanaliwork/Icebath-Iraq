import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, ordersTable, orderItemsTable, adminUsersTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middlewares/auth";

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
  } catch {
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
  const products = await db.select().from(productsTable).orderBy(desc(productsTable.createdAt));
  res.json(products);
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, imageUrl, inStock } = req.body;
    const [product] = await db.insert(productsTable).values({
      name, description: description || null, price: parseInt(price),
      imageUrl: imageUrl || null, inStock: inStock !== false,
    }).returning();
    res.status(201).json(product);
  } catch {
    res.status(400).json({ error: "Failed to create product" });
  }
});

router.put("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, price, imageUrl, inStock } = req.body;
    const [product] = await db.update(productsTable)
      .set({ name, description: description || null, price: parseInt(price), imageUrl: imageUrl || null, inStock })
      .where(eq(productsTable.id, id)).returning();
    if (!product) { res.status(404).json({ error: "Not found" }); return; }
    res.json(product);
  } catch {
    res.status(400).json({ error: "Failed to update product" });
  }
});

router.patch("/admin/products/:id/stock", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [product] = await db.update(productsTable)
      .set({ inStock: req.body.inStock })
      .where(eq(productsTable.id, id)).returning();
    res.json(product);
  } catch {
    res.status(400).json({ error: "Failed to update stock" });
  }
});

router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Failed to delete product" });
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
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const [order] = await db.update(ordersTable)
      .set({ status: req.body.status })
      .where(eq(ordersTable.id, parseInt(req.params.id))).returning();
    res.json(order);
  } catch {
    res.status(400).json({ error: "Failed to update order" });
  }
});

export default router;
