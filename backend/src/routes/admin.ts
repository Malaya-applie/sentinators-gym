import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthRequest } from "../middleware/auth";
import { generateAgreementPdf } from "../lib/generateAgreementPdf";

const router = Router();

// ─── ADMIN: MEMBERSHIP PLANS & PLAN CATEGORIES ───────────────
function serializePlan(p: {
  id: number;
  name: string;
  duration: string;
  price: number;
  monthlyPrice: number | null;
  quarterlyPrice: number | null;
  currency: string;
  features: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...p, features: p.features.join(", ") };
}
function parseFeatures(features: string | string[]): string[] {
  if (Array.isArray(features)) return features;
  if (typeof features === "string")
    return features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
  return [];
}

// GET /api/admin/content/membership-plans
router.get(
  "/content/membership-plans",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.membershipPlan.findMany({
        orderBy: [{ category: "asc" }, { id: "asc" }],
      });
      res.json(rows.map(serializePlan));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// POST /api/admin/content/membership-plans
router.post(
  "/content/membership-plans",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        duration,
        price,
        monthlyPrice,
        quarterlyPrice,
        currency,
        features,
        category,
        isActive,
      } = req.body;
      const row = await prisma.membershipPlan.create({
        data: {
          name: name || "New Plan",
          duration: duration || "1 Month",
          price: Math.max(0, Number(price) || 0),
          monthlyPrice:
            monthlyPrice != null && Number(monthlyPrice) > 0
              ? Number(monthlyPrice)
              : null,
          quarterlyPrice:
            quarterlyPrice != null && Number(quarterlyPrice) > 0
              ? Number(quarterlyPrice)
              : null,
          currency: currency || "CHF",
          features: parseFeatures(features),
          category: (category || "MEMBERSHIP") as any,
          isActive: isActive !== false,
        },
      });
      res.json(serializePlan(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// PUT /api/admin/content/membership-plans/:id
router.put(
  "/content/membership-plans/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        features,
        price,
        monthlyPrice,
        quarterlyPrice,
        isActive,
        ...rest
      } = req.body;
      const row = await prisma.membershipPlan.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(price !== undefined ? { price: Math.max(0, Number(price)) } : {}),
          ...(monthlyPrice !== undefined
            ? {
                monthlyPrice:
                  Number(monthlyPrice) > 0 ? Number(monthlyPrice) : null,
              }
            : {}),
          ...(quarterlyPrice !== undefined
            ? {
                quarterlyPrice:
                  Number(quarterlyPrice) > 0 ? Number(quarterlyPrice) : null,
              }
            : {}),
          ...(features !== undefined
            ? { features: parseFeatures(features) }
            : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(serializePlan(row));
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);

// GET /api/admin/content/plan-categories
router.get(
  "/content/plan-categories",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const categories = await prisma.planCategoryItem.findMany({
        orderBy: { order: "asc" },
        select: { id: true, name: true, label: true, order: true },
      });
      res.json(categories);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch plan categories" });
    }
  },
);

// POST /api/admin/content/plan-categories
router.post(
  "/content/plan-categories",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, label, order } = req.body;
      const catName = (name || label || "").trim();
      if (!catName) {
        res.status(400).json({ error: "name/label is required" });
        return;
      }
      const row = await prisma.planCategoryItem.create({
        data: {
          name: catName,
          label: label || catName,
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err: any) {
      if (err?.code === "P2002") {
        res
          .status(400)
          .json({ error: "A category with this name already exists" });
      } else {
        res.status(500).json({ error: "Failed to create plan category" });
      }
    }
  },
);

// PUT /api/admin/content/plan-categories/:id
router.put(
  "/content/plan-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { label, order } = req.body;
      const row = await prisma.planCategoryItem.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(label !== undefined ? { label } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update plan category" });
    }
  },
);

// DELETE /api/admin/content/plan-categories/:id
router.delete(
  "/content/plan-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const cat = await prisma.planCategoryItem.findUnique({ where: { id } });
      if (!cat) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      // Check if any plans use this category
      const count = await prisma.membershipPlan.count({
        where: { category: cat.name },
      });
      if (count > 0) {
        res
          .status(400)
          .json({
            error: `Cannot delete: ${count} plan(s) are assigned to this category. Reassign them first.`,
          });
        return;
      }
      await prisma.planCategoryItem.delete({ where: { id } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete plan category" });
    }
  },
);

// DELETE /api/admin/content/membership-plans/:id
router.delete(
  "/content/membership-plans/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const count = await prisma.membershipPurchase.count({
        where: { planId: id },
      });
      if (count > 0) {
        res
          .status(400)
          .json({
            error: `Cannot delete: this plan has ${count} purchase(s). Deactivate it instead.`,
          });
        return;
      }
      await prisma.membershipPlan.delete({ where: { id } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete membership plan" });
    }
  },
);

// ─── POST /api/admin/login ───────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid admin credentials" });
      return;
    }

    const token = jwt.sign(
      { adminId: admin.id, isAdmin: true },
      process.env.JWT_ADMIN_SECRET as string,
      { expiresIn: "8h" },
    );

    res.json({
      message: "Admin login successful",
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /api/admin/me ──────────────────────────────────
router.get(
  "/me",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: req.userId },
        select: { id: true, name: true, email: true },
      });
      if (!admin) {
        res.status(404).json({ error: "Admin not found" });
        return;
      }
      res.json({ admin });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch admin" });
    }
  },
);

// ─── GET /api/admin/stats ────────────────────────────────
router.get(
  "/stats",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        pendingMemberships,
        approvedMemberships,
        pendingOrders,
        approvedOrders,
        totalOrders,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.membershipPurchase.count({ where: { status: "PENDING" } }),
        prisma.membershipPurchase.count({ where: { status: "APPROVED" } }),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "APPROVED" } }),
        prisma.order.count(),
      ]);

      res.json({
        totalUsers,
        pendingMemberships,
        approvedMemberships,
        pendingOrders,
        approvedOrders,
        totalOrders,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  },
);

// ─── GET /api/admin/users ────────────────────────────────
router.get(
  "/users",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          goal: true,
          createdAt: true,
          _count: { select: { memberships: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// ─── GET /api/admin/users/:id ───────────────────────────
router.get(
  "/users/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid user id" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          weight: true,
          height: true,
          goal: true,
          experience: true,
          createdAt: true,
          memberships: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
          },
          orders: {
            include: { items: { include: { product: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Enrich memberships with additional plan details
      const allAdditionalIds = Array.from(
        new Set(user.memberships.flatMap((m) => m.additionalPlanIds)),
      );
      const additionalPlansMap: Record<number, any> = {};
      if (allAdditionalIds.length > 0) {
        const additionalPlans = await prisma.membershipPlan.findMany({
          where: { id: { in: allAdditionalIds } },
        });
        additionalPlans.forEach((p) => {
          additionalPlansMap[p.id] = p;
        });
      }

      const enrichedUser = {
        ...user,
        memberships: user.memberships.map((m) => ({
          ...m,
          additionalPlans: m.additionalPlanIds
            .map((pid) => additionalPlansMap[pid])
            .filter(Boolean),
        })),
      };

      res.json({ user: enrichedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  },
);

// ─── GET /api/admin/memberships ──────────────────────────
router.get(
  "/memberships",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query as { status?: string };
      const where = status ? { status: status.toUpperCase() as any } : {};
      const purchases = await prisma.membershipPurchase.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          plan: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Attach additional plan details for each purchase
      const allAdditionalIds = Array.from(
        new Set(purchases.flatMap((p) => p.additionalPlanIds)),
      );
      const additionalPlansMap: Record<number, any> = {};
      if (allAdditionalIds.length > 0) {
        const additionalPlans = await prisma.membershipPlan.findMany({
          where: { id: { in: allAdditionalIds } },
        });
        additionalPlans.forEach((p) => {
          additionalPlansMap[p.id] = p;
        });
      }

      const enriched = purchases.map((p) => ({
        ...p,
        additionalPlans: p.additionalPlanIds
          .map((id) => additionalPlansMap[id])
          .filter(Boolean),
      }));

      res.json({ purchases: enriched });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  },
);

// ─── PATCH /api/admin/memberships/:id ───────────────────
// body: { status: "APPROVED" | "REJECTED", notes?: string }
router.patch(
  "/memberships/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { status, notes } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        res.status(400).json({ error: "status must be APPROVED or REJECTED" });
        return;
      }

      const purchase = await prisma.membershipPurchase.update({
        where: { id },
        data: { status, notes: notes || null },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          plan: true,
        },
      });

      res.json({ message: `Membership ${status.toLowerCase()}`, purchase });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update membership status" });
    }
  },
);

// ─── POST /api/admin/memberships/renew ──────────────────
// body: { userId, planId, additionalPlanIds?, startDate, paymentFrequency, registrationFee?, totalAmount?, notes? }
router.post(
  "/memberships/renew",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        userId,
        planId,
        additionalPlanIds = [],
        startDate,
        paymentFrequency = "MONTHLY",
        registrationFee = 0,
        totalAmount,
        notes,
        signatureDataUrl,
      } = req.body;

      if (!userId || !planId) {
        res.status(400).json({ error: "userId and planId are required" });
        return;
      }

      const [user, plan] = await Promise.all([
        prisma.user.findUnique({ where: { id: Number(userId) } }),
        prisma.membershipPlan.findUnique({ where: { id: Number(planId) } }),
      ]);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (!plan) {
        res.status(404).json({ error: "Plan not found" });
        return;
      }

      // Compute end date from start + plan duration + additional plan durations
      let parsedStart: Date | null = null;
      if (startDate) {
        const d = new Date(startDate);
        if (!Number.isNaN(d.getTime())) parsedStart = d;
      }

      let parsedEnd: Date | null = null;
      if (parsedStart) {
        const allIds: number[] = Array.isArray(additionalPlanIds)
          ? additionalPlanIds.map(Number).filter(Boolean)
          : [];

        const addOns = allIds.length
          ? await prisma.membershipPlan.findMany({
              where: { id: { in: allIds } },
            })
          : [];

        const totalMonths = [plan, ...addOns].reduce((sum, p) => {
          const m = p.duration
            .toLowerCase()
            .trim()
            .match(/^(\d+)\s*(month|year|day|week)/);
          if (!m) return sum;
          const num = parseInt(m[1]);
          const unit = m[2];
          if (unit === "month") return sum + num;
          if (unit === "year") return sum + num * 12;
          if (unit === "week") return sum + Math.round((num * 7) / 30.44);
          if (unit === "day") return sum + Math.round(num / 30.44);
          return sum;
        }, 0);

        if (totalMonths > 0) {
          const end = new Date(parsedStart);
          end.setMonth(end.getMonth() + totalMonths);
          parsedEnd = end;
        }
      }

      const contractNumber =
        "CNT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const customerNumber =
        "CUS-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      const purchase = await prisma.membershipPurchase.create({
        data: {
          userId: Number(userId),
          planId: Number(planId),
          additionalPlanIds: Array.isArray(additionalPlanIds)
            ? additionalPlanIds.map(Number).filter(Boolean)
            : [],
          status: "APPROVED",
          registrationFee: Number(registrationFee) || 0,
          totalAmount: totalAmount != null ? Number(totalAmount) : null,
          startDate: parsedStart,
          endDate: parsedEnd,
          paymentFrequency,
          notes: notes || null,
          signatureDataUrl: signatureDataUrl || null,
          acceptedAgreement: true,
          acceptedTerms: true,
          registrationDetails: {
            contractNumber,
            customerNumber,
            renewedByAdmin: true,
          },
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          plan: true,
        },
      });

      res.json({ message: "Membership renewed successfully", purchase });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to renew membership" });
    }
  },
);

// ─── GET /api/admin/orders ───────────────────────────────
router.get(
  "/orders",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.query as { status?: string };
      const where = status ? { status: status.toUpperCase() as any } : {};
      const orders = await prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ orders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  },
);

// ─── PATCH /api/admin/orders/:id ─────────────────────────
// body: { status: "APPROVED" | "REJECTED", notes?: string }
router.patch(
  "/orders/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { status, notes } = req.body;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        res.status(400).json({ error: "status must be APPROVED or REJECTED" });
        return;
      }

      // Fetch the current order to check its existing status and items
      const existing = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Only decrement stock when transitioning to APPROVED for the first time
      if (status === "APPROVED" && existing.status !== "APPROVED") {
        // Validate stock is still sufficient before approving
        for (const item of existing.items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          if (!product || product.stock < item.quantity) {
            res.status(400).json({
              error: `Insufficient stock for product id ${item.productId}. Cannot approve.`,
            });
            return;
          }
        }

        // Decrement stock for each item
        await Promise.all(
          existing.items.map((item) =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            }),
          ),
        );
      }

      // If reverting from APPROVED to REJECTED, restore stock
      if (status === "REJECTED" && existing.status === "APPROVED") {
        await Promise.all(
          existing.items.map((item) =>
            prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            }),
          ),
        );
      }

      const order = await prisma.order.update({
        where: { id },
        data: { status, notes: notes || null },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          items: { include: { product: true } },
        },
      });

      res.json({ message: `Order ${status.toLowerCase()}`, order });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update order status" });
    }
  },
);

// ══════════════════════════════════════════════════════════
// CONTENT MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════

// ─── GET  /api/admin/content/text ──────────────────────
router.get(
  "/content/text",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.siteContent.findMany({
        orderBy: { section: "asc" },
      });
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch text content" });
    }
  },
);

// ─── PUT  /api/admin/content/text/:key ─────────────────
router.put(
  "/content/text/:key",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { value, section } = req.body;
      const row = await prisma.siteContent.upsert({
        where: { key: req.params.key as string },
        update: { value, ...(section ? { section } : {}) },
        create: {
          key: req.params.key as string,
          value,
          section: section || "general",
        },
      });
      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update text content" });
    }
  },
);

// ─── PUT  /api/admin/content/text/bulk ─────────────────
// body: { updates: [{ key, value, section }] }
router.put(
  "/content/text",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { updates } = req.body as {
        updates: { key: string; value: string; section: string }[];
      };
      await Promise.all(
        updates.map((u) =>
          prisma.siteContent.upsert({
            where: { key: u.key },
            update: { value: u.value, section: u.section },
            create: { key: u.key, value: u.value, section: u.section },
          }),
        ),
      );
      res.json({ message: "Text content updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to bulk-update text content" });
    }
  },
);

// ─── STATS ─────────────────────────────────────────────
router.get(
  "/content/stats",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.stat.findMany({ orderBy: { order: "asc" } });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  },
);
// POST /api/admin/content/stats
router.post(
  "/content/stats",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { value, label, order } = req.body;
      const row = await prisma.stat.create({
        data: {
          value: value || "",
          label: label || "",
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create stat" });
    }
  },
);

// PUT /api/admin/content/stats/:id
router.put(
  "/content/stats/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { value, label, order, isActive } = req.body;
      const row = await prisma.stat.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(value !== undefined ? { value } : {}),
          ...(label !== undefined ? { label } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update stat" });
    }
  },
);

// DELETE /api/admin/content/stats/:id
router.delete(
  "/content/stats/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.stat.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete stat" });
    }
  },
);

// ─── TRAINERS ──────────────────────────────────────────
router.get(
  "/content/trainers",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.trainer.findMany({ orderBy: { order: "asc" } });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch trainers" });
    }
  },
);

router.post(
  "/content/trainers",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, description, image, order } = req.body;
      const row = await prisma.trainer.create({
        data: {
          name: name || "",
          role: role || "",
          description: description || null,
          image: image || null,
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create trainer" });
    }
  },
);

router.put(
  "/content/trainers/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, description, image, order, isActive } = req.body;
      const row = await prisma.trainer.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update trainer" });
    }
  },
);

router.delete(
  "/content/trainers/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.trainer.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete trainer" });
    }
  },
);

// ─── TESTIMONIALS ──────────────────────────────────────
router.get(
  "/content/testimonials",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.testimonial.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  },
);

router.post(
  "/content/testimonials",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, rating, content, image, order } = req.body;
      const row = await prisma.testimonial.create({
        data: {
          name: name || "",
          role: role || "",
          rating: Number(rating) || 5,
          content: content || "",
          image: image || null,
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create testimonial" });
    }
  },
);

router.put(
  "/content/testimonials/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, role, rating, content, image, order, isActive } = req.body;
      const row = await prisma.testimonial.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(role !== undefined ? { role } : {}),
          ...(rating !== undefined ? { rating: Number(rating) } : {}),
          ...(content !== undefined ? { content } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update testimonial" });
    }
  },
);

router.delete(
  "/content/testimonials/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.testimonial.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete testimonial" });
    }
  },
);

// ─── BLOG ──────────────────────────────────────────────
router.get(
  "/content/blog",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  },
);

router.post(
  "/content/blog",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, excerpt, content, image } = req.body;
      const row = await prisma.blogPost.create({
        data: {
          title: title || "",
          excerpt: excerpt || "",
          content: content || null,
          image: image || null,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create blog post" });
    }
  },
);

router.put(
  "/content/blog/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, excerpt, content, image, isActive } = req.body;
      const row = await prisma.blogPost.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(excerpt !== undefined ? { excerpt } : {}),
          ...(content !== undefined ? { content } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update blog post" });
    }
  },
);

router.delete(
  "/content/blog/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.blogPost.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  },
);

// ─── GALLERY ───────────────────────────────────────────
router.get(
  "/content/gallery",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.galleryImage.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  },
);

router.post(
  "/content/gallery",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { src, alt, category, gridCol, gridRow, order } = req.body;
      const row = await prisma.galleryImage.create({
        data: {
          src: src || "",
          alt: alt || "",
          category: category || "All",
          gridCol: gridCol || null,
          gridRow: gridRow || null,
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create gallery image" });
    }
  },
);

router.put(
  "/content/gallery/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { src, alt, category, gridCol, gridRow, order, isActive } =
        req.body;
      const row = await prisma.galleryImage.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(src !== undefined ? { src } : {}),
          ...(alt !== undefined ? { alt } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(gridCol !== undefined ? { gridCol } : {}),
          ...(gridRow !== undefined ? { gridRow } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update gallery image" });
    }
  },
);

router.delete(
  "/content/gallery/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.galleryImage.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete gallery image" });
    }
  },
);

// ─── ACHIEVEMENTS ──────────────────────────────────────
router.get(
  "/content/achievements",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.achievement.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  },
);

router.post(
  "/content/achievements",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, title, order } = req.body;
      const row = await prisma.achievement.create({
        data: {
          image: image || null,
          title: title || "",
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create achievement" });
    }
  },
);

router.put(
  "/content/achievements/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, title, order, isActive } = req.body;
      const row = await prisma.achievement.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(image !== undefined ? { image } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update achievement" });
    }
  },
);

router.delete(
  "/content/achievements/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.achievement.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete achievement" });
    }
  },
);

// ─── WHY CHOOSE US FEATURES ────────────────────────────
router.get(
  "/content/why-features",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.whyChooseUsFeature.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch why-features" });
    }
  },
);

router.post(
  "/content/why-features",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { icon, title, description, order } = req.body;
      const row = await prisma.whyChooseUsFeature.create({
        data: {
          icon: icon || "Dumbbell",
          title: title || "",
          description: description || "",
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create why-feature" });
    }
  },
);

router.put(
  "/content/why-features/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { icon, title, description, order, isActive } = req.body;
      const row = await prisma.whyChooseUsFeature.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(icon !== undefined ? { icon } : {}),
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update why-feature" });
    }
  },
);

router.delete(
  "/content/why-features/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.whyChooseUsFeature.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete why-feature" });
    }
  },
);

// ─── EVENT HIGHLIGHTS ──────────────────────────────────
router.get(
  "/content/event-highlights",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.eventHighlight.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch event-highlights" });
    }
  },
);

router.post(
  "/content/event-highlights",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, description, image, videoUrl, order } = req.body;
      const row = await prisma.eventHighlight.create({
        data: {
          title: title || "",
          description: description || null,
          image: image || null,
          videoUrl: videoUrl || null,
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create event-highlight" });
    }
  },
);

router.put(
  "/content/event-highlights/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, description, image, videoUrl, order, isActive, isMain } =
        req.body;
      const row = await prisma.eventHighlight.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(videoUrl !== undefined ? { videoUrl } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(isMain !== undefined ? { isMain } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update event-highlight" });
    }
  },
);

router.delete(
  "/content/event-highlights/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.eventHighlight.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete event-highlight" });
    }
  },
);

// ─── TRAINING ZONES ────────────────────────────────────
router.get(
  "/content/training-zones",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.trainingZone.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch training-zones" });
    }
  },
);

router.post(
  "/content/training-zones",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, alt, order } = req.body;
      const row = await prisma.trainingZone.create({
        data: {
          image: image || null,
          alt: alt || "",
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create training-zone" });
    }
  },
);

router.put(
  "/content/training-zones/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { image, alt, order, isActive } = req.body;
      const row = await prisma.trainingZone.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(image !== undefined ? { image } : {}),
          ...(alt !== undefined ? { alt } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update training-zone" });
    }
  },
);

router.delete(
  "/content/training-zones/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.trainingZone.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete training-zone" });
    }
  },
);

// ─── PRODUCTS (Admin) ──────────────────────────────────
router.get(
  "/content/products",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.product.findMany({ orderBy: { id: "asc" } });
      // serialize features array to comma-separated string for the admin UI
      res.json(rows.map((p) => ({ ...p, features: p.features.join(", ") })));
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  },
);

router.post(
  "/content/products",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, price, currency, image, category, features, stock } =
        req.body;
      const featuresArr: string[] = Array.isArray(features)
        ? features
        : typeof features === "string"
          ? features
              .split(",")
              .map((f: string) => f.trim())
              .filter(Boolean)
          : [];
      const row = await prisma.product.create({
        data: {
          name: name || "",
          price: Number(price) || 0,
          currency: currency || "CHF",
          image: image || null,
          category: category || "General",
          features: featuresArr,
          stock: Number(stock) || 100,
        },
      });
      res.json({ ...row, features: row.features.join(", ") });
    } catch (err) {
      res.status(500).json({ error: "Failed to create product" });
    }
  },
);

router.put(
  "/content/products/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        price,
        currency,
        image,
        category,
        features,
        stock,
        isActive,
      } = req.body;
      const row = await prisma.product.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(image !== undefined ? { image } : {}),
          ...(category !== undefined ? { category } : {}),
          ...(features !== undefined
            ? {
                features: Array.isArray(features)
                  ? features
                  : String(features)
                      .split(",")
                      .map((f: string) => f.trim())
                      .filter(Boolean),
              }
            : {}),
          ...(stock !== undefined ? { stock: Number(stock) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json({ ...row, features: row.features.join(", ") });
    } catch (err) {
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

router.delete(
  "/content/products/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Check if product has order items
      const count = await prisma.orderItem.count({
        where: { productId: Number(req.params.id) },
      });
      if (count > 0) {
        res
          .status(400)
          .json({
            error:
              "Cannot delete product with existing orders. Deactivate it instead.",
          });
        return;
      }
      await prisma.product.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  },
);

// ─── PRODUCT CATEGORIES (Admin) ────────────────────────
router.get(
  "/content/product-categories",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.productCategory.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch product categories" });
    }
  },
);

router.post(
  "/content/product-categories",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, order } = req.body;
      const row = await prisma.productCategory.create({
        data: { name: name || "", order: Number(order) || 0 },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create product category" });
    }
  },
);

router.put(
  "/content/product-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, order, isActive } = req.body;
      const row = await prisma.productCategory.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update product category" });
    }
  },
);

router.delete(
  "/content/product-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.productCategory.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete product category" });
    }
  },
);

// ─── FAQs ──────────────────────────────────────────────
router.get(
  "/content/faqs",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch FAQs" });
    }
  },
);

router.post(
  "/content/faqs",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { question, answer, order } = req.body;
      const row = await prisma.faqItem.create({
        data: {
          question: question || "",
          answer: answer || "",
          order: Number(order) || 0,
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to create FAQ" });
    }
  },
);

router.put(
  "/content/faqs/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { question, answer, order, isActive } = req.body;
      const row = await prisma.faqItem.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(question !== undefined ? { question } : {}),
          ...(answer !== undefined ? { answer } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update FAQ" });
    }
  },
);

router.delete(
  "/content/faqs/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.faqItem.delete({ where: { id: Number(req.params.id) } });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete FAQ" });
    }
  },
);
router.get(
  "/users/:id/contract/download",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = Number(req.params.id);
      if (isNaN(userId)) {
        res.status(400).json({ error: "Invalid user id" });
        return;
      }

      // Fetch user (basic fields)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Fetch approved memberships with plan, ordered by latest
      const memberships = await prisma.membershipPurchase.findMany({
        where: {
          userId,
          status: "APPROVED",
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (memberships.length === 0) {
        res
          .status(404)
          .json({ error: "No approved membership found for this user" });
        return;
      }

      const latestMembership = memberships[0];

      // Fetch additional plans for this membership
      const additionalPlanIds = latestMembership.additionalPlanIds
        .map((id) => Number(id))
        .filter(Boolean);
      const additionalPlans: {
        name: string;
        duration: string;
        price: number;
      }[] = [];
      if (additionalPlanIds.length > 0) {
        const plans = await prisma.membershipPlan.findMany({
          where: {
            id: {
              in: additionalPlanIds,
            },
          },
          select: {
            name: true,
            duration: true,
            price: true,
          },
        });
        additionalPlans.push(
          ...plans.map((p) => ({
            name: p.name,
            duration: p.duration,
            price: p.price,
          })),
        );
      }

      // Prepare data for PDF generation
      const registrationDetails =
        (latestMembership.registrationDetails as {
          contractNumber?: string;
          customerNumber?: string;
        }) || {};
      const contractNumber =
        registrationDetails.contractNumber ??
        `CNT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const customerNumber =
        registrationDetails.customerNumber ??
        `CUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const memberName = `${user.firstName} ${user.lastName}`.trim();
      const email = user.email || "";
      const phone = user.phone || "";
      const dateOfBirth = user.dateOfBirth
        ? user.dateOfBirth.toISOString().split("T")[0]
        : "";
      // Address and emergencyContact are stored in the membership
      const address = latestMembership.address ?? "";
      const emergencyContact = latestMembership.emergencyContact ?? "";
      const planName = latestMembership.plan.name;
      const planDuration = latestMembership.plan.duration;
      const planPrice = latestMembership.plan.price;
      const currency = latestMembership.plan.currency;
      const registrationFee = latestMembership.registrationFee ?? 0;
      // discountAmount and discountLabel are not stored; we can set to 0 and empty string
      const discountAmount = 0;
      const discountLabel = "";
      const total = latestMembership.totalAmount ?? 0;
      const startDate = latestMembership.startDate
        ? new Date(latestMembership.startDate).toISOString().split("T")[0]
        : "";
      const endDate = latestMembership.endDate
        ? new Date(latestMembership.endDate).toISOString().split("T")[0]
        : "";
      const paymentFrequency = latestMembership.paymentFrequency ?? "MONTHLY";
      // periodicAmount is not stored; we can calculate from total and paymentFrequency? Not needed for now, set to null
      const periodicAmount = null;
      const signatureDataUrl = latestMembership.signatureDataUrl ?? "";
      const isMinor = false; // we don't have this field, assume false
      const guardianSignatureDataUrl = undefined;
      const submittedAt = latestMembership.createdAt
        ? new Date(latestMembership.createdAt).toISOString()
        : new Date().toISOString();

      const pdfData = {
        contractNumber,
        customerNumber,
        memberName,
        email,
        phone,
        dateOfBirth,
        address,
        emergencyContact,
        planName,
        planDuration,
        planPrice,
        currency,
        additionalPlans,
        registrationFee,
        discountAmount,
        discountLabel,
        total,
        startDate,
        endDate,
        paymentFrequency,
        periodicAmount,
        signatureDataUrl,
        guardianSignatureDataUrl,
        isMinor,
        submittedAt,
      };

      const pdfBuffer = await generateAgreementPdf(pdfData);

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contract-${userId}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate contract" });
    }
  },
);

export default router;
