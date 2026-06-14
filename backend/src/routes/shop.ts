import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/shop/products ──────────────────────────────
// Public – list active products with optional category + pagination
router.get("/products", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 6));
    const categoryQuery =
      typeof req.query.category === "string" ? req.query.category.trim() : "";

    const where = {
      isActive: true,
      ...(categoryQuery && categoryQuery !== "All"
        ? { category: categoryQuery }
        : {}),
    };

    const total = await prisma.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const products = await prisma.product.findMany({
      where,
      orderBy: { id: "asc" },
      skip: (safePage - 1) * limit,
      take: limit,
    });

    res.json({
      products,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ─── GET /api/shop/categories ────────────────────────────
// Public – list all active product category tabs
router.get("/categories", async (_req, res: Response): Promise<void> => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ─── POST /api/shop/order ───────────────────────────────
// Auth required – place a shop order
// body: { items: [{ productId, quantity }] }
router.post(
  "/order",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { items } = req.body as {
        items: { productId: number; quantity: number }[];
      };

      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "items array is required" });
        return;
      }

      // Validate products exist
      const productIds = items.map((i) => Number(i.productId));
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      });

      if (products.length !== productIds.length) {
        res.status(400).json({ error: "One or more products not found" });
        return;
      }

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      // Validate stock for each item
      for (const item of items) {
        const product = productMap[Number(item.productId)];
        if (product.stock < Number(item.quantity)) {
          res.status(400).json({
            error: `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
          });
          return;
        }
      }

      const totalAmount = items.reduce((sum, item) => {
        const product = productMap[Number(item.productId)];
        return sum + product.price * Number(item.quantity);
      }, 0);

      const order = await prisma.order.create({
        data: {
          userId: req.userId as number,
          totalAmount,
          status: "PENDING",
          items: {
            create: items.map((item) => ({
              productId: Number(item.productId),
              quantity: Number(item.quantity),
              unitPrice: productMap[Number(item.productId)].price,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      res.status(201).json({
        message: "Order placed successfully. Awaiting admin approval.",
        order,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Order placement failed" });
    }
  },
);

// ─── GET /api/shop/my-orders ─────────────────────────────
// Auth required – user sees their own orders
router.get(
  "/my-orders",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const orders = await prisma.order.findMany({
        where: { userId: req.userId },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json({ orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  },
);

export default router;
