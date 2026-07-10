import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthRequest } from "../middleware/auth";
import {
  generateAgreementPdf,
  AgreementPdfData,
} from "../lib/generateAgreementPdf";
import {
  normalizeEquipmentFeatureItems,
  parseEquipmentFeatureItems,
} from "../lib/equipmentFeatureItems";

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

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseNumberish(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type AgreementSection = { title: string; content: string };

function parseAgreementSections(
  raw: unknown,
  fallback: AgreementSection[],
): AgreementSection[] {
  if (typeof raw !== "string" || raw.trim().length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed
      .filter(
        (s): s is AgreementSection =>
          s &&
          typeof s === "object" &&
          typeof (s as Record<string, unknown>).title === "string" &&
          typeof (s as Record<string, unknown>).content === "string",
      )
      .map((s) => ({ title: s.title, content: s.content }));
  } catch {
    return fallback;
  }
}

function resolveFrontendPublicAsset(fileName: string): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), "../frontend/public", fileName),
    path.resolve(process.cwd(), "frontend/public", fileName),
    path.resolve(__dirname, "../../../frontend/public", fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return undefined;
}

function resolveContractAddress(
  registrationDetails: Record<string, unknown>,
  fallbackAddress: string | null | undefined,
): string {
  const directAddress =
    typeof registrationDetails.address === "string"
      ? registrationDetails.address.trim()
      : "";
  if (directAddress) return directAddress;

  const street =
    typeof registrationDetails.street === "string"
      ? registrationDetails.street.trim()
      : "";
  const postalCode =
    typeof registrationDetails.postalCode === "string"
      ? registrationDetails.postalCode.trim()
      : "";
  const location =
    typeof registrationDetails.location === "string"
      ? registrationDetails.location.trim()
      : "";

  const composed = [street, [postalCode, location].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (composed) return composed;

  return (fallbackAddress ?? "").trim();
}

async function buildPdfBufferFromStoredContract(
  registrationDetails: Record<string, unknown>,
): Promise<Buffer | null> {
  const contractPdfBase64 = registrationDetails.contractPdfBase64;
  if (
    typeof contractPdfBase64 === "string" &&
    contractPdfBase64.trim().length > 0
  ) {
    const base64Data = contractPdfBase64.replace(
      /^data:application\/pdf;base64,/,
      "",
    );
    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > 0) return buffer;
  }

  const contractImageBase64 = registrationDetails.contractImageBase64;
  if (
    typeof contractImageBase64 === "string" &&
    contractImageBase64.trim().length > 0
  ) {
    const base64Data = contractImageBase64.replace(
      /^data:image\/(?:jpeg|jpg);base64,/,
      "",
    );
    const imgBuffer = Buffer.from(base64Data, "base64");
    if (imgBuffer.length === 0) return null;

    const getJpegDims = (buf: Buffer): { w: number; h: number } => {
      let i = 2;
      while (i < buf.length - 8) {
        if (buf[i] !== 0xff) break;
        const marker = buf[i + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
      return { w: 1240, h: 1754 };
    };

    const { w: imgW, h: imgH } = getJpegDims(imgBuffer);

    return await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const PDFDocument = require("pdfkit") as typeof import("pdfkit");
      const pageW = 595.28;
      const pageH = 841.89;
      const doc = new PDFDocument({ autoFirstPage: false, margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const scaledFullH = (imgH / imgW) * pageW;
      if (scaledFullH <= pageH) {
        doc.addPage({ size: [pageW, pageH] });
        doc.image(imgBuffer, 0, 0, { width: pageW });
      } else {
        const pxPerPage = (pageH / pageW) * imgW;
        let yPx = 0;
        while (yPx < imgH) {
          doc.addPage({ size: [pageW, pageH] });
          const yPt = -(yPx / imgW) * pageW;
          doc.image(imgBuffer, 0, yPt, { width: pageW });
          yPx += pxPerPage;
        }
      }
      doc.end();
    });
  }

  return null;
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
          duration: category === "ADDITIONAL" ? "" : duration || "1 Month",
          price: Number(price) || 0,
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
        duration: rawDuration,
        category,
        ...rest
      } = req.body;
      const row = await prisma.membershipPlan.update({
        where: { id: Number(req.params.id) },
        data: {
          ...rest,
          ...(category !== undefined ? { category } : {}),
          ...(rawDuration !== undefined || category !== undefined
            ? {
                duration:
                  category === "ADDITIONAL" ? "" : rawDuration || "1 Month",
              }
            : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
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
        res.status(400).json({
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
        res.status(400).json({
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

      const enriched = purchases.map((p) => {
        const details = asRecord(p.registrationDetails);
        return {
          ...p,
          address: resolveContractAddress(details, p.address),
          additionalPlans: p.additionalPlanIds
            .map((id) => additionalPlansMap[id])
            .filter(Boolean),
        };
      });

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
        endDate,
        paymentFrequency = "MONTHLY",
        registrationFee = 0,
        totalAmount,
        notes,
        signatureDataUrl,
        registrationDetails,
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
            .match(/^(\d+)\s*(monat|month|year|day|week)/);
          if (!m) return sum;
          const num = parseInt(m[1]);
          const unit = m[2];
          if (unit === "monat" || unit === "month") return sum + num;
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

      if (typeof endDate === "string") {
        const explicitEnd = new Date(endDate);
        if (!Number.isNaN(explicitEnd.getTime())) {
          parsedEnd = explicitEnd;
        }
      }

      const normalizedFrequency =
        typeof paymentFrequency === "string" &&
        ["MONTHLY", "QUARTERLY", "YEARLY", "UPFRONT"].includes(paymentFrequency)
          ? paymentFrequency
          : "UPFRONT";

      const details =
        registrationDetails &&
        typeof registrationDetails === "object" &&
        !Array.isArray(registrationDetails)
          ? (registrationDetails as Record<string, unknown>)
          : {};

      const contractNumber =
        typeof details.contractNumber === "string" &&
        details.contractNumber.trim().length > 0
          ? details.contractNumber.trim()
          : "CNT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const customerNumber =
        typeof details.customerNumber === "string" &&
        details.customerNumber.trim().length > 0
          ? details.customerNumber.trim()
          : "CUS-" + Math.random().toString(36).substring(2, 8).toUpperCase();

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
          paymentFrequency: normalizedFrequency,
          notes: notes || null,
          signatureDataUrl: signatureDataUrl || null,
          acceptedAgreement: true,
          acceptedTerms: true,
          registrationDetails: {
            ...details,
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

// ─── GET /api/admin/memberships/:id/contract/download ─────────────
router.get(
  "/memberships/:id/contract/download",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const membershipId = Number(req.params.id);
      if (isNaN(membershipId)) {
        res.status(400).json({ error: "Invalid membership id" });
        return;
      }

      const membership = await prisma.membershipPurchase.findUnique({
        where: { id: membershipId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
            },
          },
          plan: true,
        },
      });

      if (!membership) {
        res.status(404).json({ error: "Membership not found" });
        return;
      }

      const registrationDetails = asRecord(membership.registrationDetails);
      const contractNumberFromDetails =
        typeof registrationDetails.contractNumber === "string" &&
        registrationDetails.contractNumber.trim().length > 0
          ? registrationDetails.contractNumber.trim()
          : null;

      const storedPdf =
        await buildPdfBufferFromStoredContract(registrationDetails);
      if (storedPdf) {
        const filename = contractNumberFromDetails
          ? `contract-${contractNumberFromDetails}.pdf`
          : `contract-membership-${membershipId}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        res.send(storedPdf);
        return;
      }

      const additionalPlanIds = membership.additionalPlanIds
        .map((id) => Number(id))
        .filter(Boolean);
      const additionalPlans =
        additionalPlanIds.length > 0
          ? await prisma.membershipPlan.findMany({
              where: { id: { in: additionalPlanIds } },
              select: { name: true, duration: true, price: true },
            })
          : [];

      const contractNumber =
        contractNumberFromDetails ??
        `CNT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const customerNumber =
        typeof registrationDetails.customerNumber === "string" &&
        registrationDetails.customerNumber.trim().length > 0
          ? registrationDetails.customerNumber.trim()
          : `CUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const periodicAmount = parseNumberish(registrationDetails.periodicAmount);
      const isMinor = registrationDetails.isMinor === true;
      const guardianSignatureDataUrl =
        typeof registrationDetails.guardianSignatureDataUrl === "string"
          ? registrationDetails.guardianSignatureDataUrl
          : undefined;
      const [membershipTermsRow, gymRulesRow] = await Promise.all([
        prisma.siteContent.findUnique({
          where: { key: "membership_terms_sections" },
          select: { value: true },
        }),
        prisma.siteContent.findUnique({
          where: { key: "gym_rules_sections" },
          select: { value: true },
        }),
      ]);

      const membershipTermsSections = parseAgreementSections(
        registrationDetails.membership_terms_sections,
        parseAgreementSections(membershipTermsRow?.value, []),
      );
      const gymRulesSections = parseAgreementSections(
        registrationDetails.gym_rules_sections,
        parseAgreementSections(gymRulesRow?.value, []),
      );
      const gymSignatureImagePath = resolveFrontendPublicAsset("gym_sign.jpeg");
      const gymStampImagePath = resolveFrontendPublicAsset("gym_stamp.jpeg");

      const pdfData: AgreementPdfData = {
        contractNumber,
        customerNumber,
        memberName:
          `${membership.user.firstName} ${membership.user.lastName}`.trim(),
        email: membership.user.email || "",
        phone: membership.user.phone || "",
        dateOfBirth: membership.user.dateOfBirth
          ? membership.user.dateOfBirth.toISOString().split("T")[0]
          : "",
        address: resolveContractAddress(
          registrationDetails,
          membership.address,
        ),
        emergencyContact: membership.emergencyContact ?? "",
        planName: membership.plan.name,
        planDuration: membership.plan.duration,
        planPrice: membership.plan.price,
        currency: membership.plan.currency,
        additionalPlans: additionalPlans.map((p) => ({
          name: p.name,
          duration: p.duration,
          price: p.price,
        })),
        registrationFee: membership.registrationFee ?? 0,
        discountAmount: parseNumberish(registrationDetails.discountAmount) ?? 0,
        discountLabel:
          typeof registrationDetails.discountLabel === "string"
            ? registrationDetails.discountLabel
            : "Rabatt",
        total: membership.totalAmount ?? 0,
        startDate: membership.startDate
          ? new Date(membership.startDate).toISOString().split("T")[0]
          : "",
        endDate: membership.endDate
          ? new Date(membership.endDate).toISOString().split("T")[0]
          : "",
        paymentFrequency: membership.paymentFrequency ?? "UPFRONT",
        periodicAmount,
        signatureDataUrl: membership.signatureDataUrl || "",
        guardianSignatureDataUrl,
        isMinor,
        submittedAt: membership.createdAt
          ? new Date(membership.createdAt).toISOString()
          : new Date().toISOString(),
        membershipTermsSections,
        gymRulesSections,
        gymSignatureImagePath,
        gymStampImagePath,
      };

      const pdfBuffer = await generateAgreementPdf(pdfData);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contract-${contractNumber}.pdf"`,
      );
      res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to generate contract" });
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

// ─── DELETE /api/admin/content/text/:key ───────────────
router.delete(
  "/content/text/:key",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const key = req.params.key as string;
      await prisma.siteContent.delete({ where: { key } });
      res.json({ message: "Text content deleted", key });
    } catch (err: any) {
      if (err?.code === "P2025") {
        res.status(404).json({ error: "Text content key not found" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Failed to delete text content" });
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

// ─── GALLERY CATEGORIES ────────────────────────────────
router.get(
  "/content/gallery-categories",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.galleryCategory.findMany({
        orderBy: { order: "asc" },
      });
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch gallery categories" });
    }
  },
);

router.post(
  "/content/gallery-categories",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, order } = req.body;
      const trimmedName = (name || "").trim();
      if (!trimmedName) {
        res.status(400).json({ error: "Category name is required" });
        return;
      }
      const row = await prisma.galleryCategory.create({
        data: { name: trimmedName, order: Number(order) || 0 },
      });
      res.json(row);
    } catch (err: any) {
      console.error("gallery-categories POST error:", err);
      if (err?.code === "P2002") {
        res
          .status(400)
          .json({ error: "A category with this name already exists" });
      } else {
        res.status(500).json({ error: "Failed to create gallery category" });
      }
    }
  },
);

router.put(
  "/content/gallery-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, order, isActive } = req.body;
      const row = await prisma.galleryCategory.update({
        where: { id: Number(req.params.id) },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(order !== undefined ? { order: Number(order) } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: "Failed to update gallery category" });
    }
  },
);

router.delete(
  "/content/gallery-categories/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await prisma.galleryCategory.delete({
        where: { id: Number(req.params.id) },
      });
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete gallery category" });
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
        res.status(400).json({
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

      const latestMembership =
        memberships.find((m) => {
          const details = asRecord(m.registrationDetails);
          return (
            typeof details.contractPdfBase64 === "string" ||
            typeof details.contractImageBase64 === "string"
          );
        }) ?? memberships[0];

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

      // Prefer the exact PDF captured from the stepper contract page when available.
      const registrationDetails = asRecord(
        latestMembership.registrationDetails,
      );
      const contractNumberFromDetails =
        typeof registrationDetails.contractNumber === "string" &&
        registrationDetails.contractNumber.trim().length > 0
          ? registrationDetails.contractNumber.trim()
          : null;

      const storedPdf =
        await buildPdfBufferFromStoredContract(registrationDetails);
      if (storedPdf) {
        const filename = contractNumberFromDetails
          ? `contract-${contractNumberFromDetails}.pdf`
          : `contract-${userId}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        res.send(storedPdf);
        return;
      }

      // Fallback for older records that don't have a captured contract PDF.
      const contractNumber =
        contractNumberFromDetails ??
        `CNT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const customerNumber =
        typeof registrationDetails.customerNumber === "string" &&
        registrationDetails.customerNumber.trim().length > 0
          ? registrationDetails.customerNumber.trim()
          : `CUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const memberName = `${user.firstName} ${user.lastName}`.trim();
      const email = user.email || "";
      const phone = user.phone || "";
      const dateOfBirth = user.dateOfBirth
        ? user.dateOfBirth.toISOString().split("T")[0]
        : "";
      // Resolve address exactly like stepper contract display: direct address first, then street+postal/location
      const address = resolveContractAddress(
        registrationDetails,
        latestMembership.address,
      );
      const emergencyContact = latestMembership.emergencyContact ?? "";
      const planName = latestMembership.plan.name;
      const planDuration = latestMembership.plan.duration;
      const planPrice = latestMembership.plan.price;
      const currency = latestMembership.plan.currency;
      const registrationFee = latestMembership.registrationFee ?? 0;
      const discountAmount =
        parseNumberish(registrationDetails.discountAmount) ?? 0;
      const discountLabel =
        typeof registrationDetails.discountLabel === "string"
          ? registrationDetails.discountLabel
          : "Rabatt";
      const total = latestMembership.totalAmount ?? 0;
      const startDate = latestMembership.startDate
        ? new Date(latestMembership.startDate).toISOString().split("T")[0]
        : "";
      const endDate = latestMembership.endDate
        ? new Date(latestMembership.endDate).toISOString().split("T")[0]
        : "";
      const paymentFrequency = latestMembership.paymentFrequency ?? "MONTHLY";
      const periodicAmount = parseNumberish(registrationDetails.periodicAmount);
      const signatureDataUrl = latestMembership.signatureDataUrl ?? "";
      const isMinor = registrationDetails.isMinor === true;
      const guardianSignatureDataUrl =
        typeof registrationDetails.guardianSignatureDataUrl === "string"
          ? registrationDetails.guardianSignatureDataUrl
          : undefined;
      const submittedAt = latestMembership.createdAt
        ? new Date(latestMembership.createdAt).toISOString()
        : new Date().toISOString();
      const [membershipTermsRow, gymRulesRow] = await Promise.all([
        prisma.siteContent.findUnique({
          where: { key: "membership_terms_sections" },
          select: { value: true },
        }),
        prisma.siteContent.findUnique({
          where: { key: "gym_rules_sections" },
          select: { value: true },
        }),
      ]);

      const membershipTermsSections = parseAgreementSections(
        registrationDetails.membership_terms_sections,
        parseAgreementSections(membershipTermsRow?.value, []),
      );
      const gymRulesSections = parseAgreementSections(
        registrationDetails.gym_rules_sections,
        parseAgreementSections(gymRulesRow?.value, []),
      );
      const gymSignatureImagePath = resolveFrontendPublicAsset("gym_sign.jpeg");
      const gymStampImagePath = resolveFrontendPublicAsset("gym_stamp.jpeg");

      const pdfData: AgreementPdfData = {
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
        membershipTermsSections,
        gymRulesSections,
        gymSignatureImagePath,
        gymStampImagePath,
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

// ─── GET /api/admin/settings ────────────────────────────
router.get(
  "/settings",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rows = await prisma.siteContent.findMany({
        where: { section: "settings" },
      });
      const map: Record<string, string> = {};
      rows.forEach((r) => (map[r.key] = r.value));
      res.json({
        quarterlyFeePercent: parseFloat(map["quarterly_fee_percent"] ?? "5"),
        monthlyFeePercent: parseFloat(map["monthly_fee_percent"] ?? "10"),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  },
);

// ─── PUT /api/admin/settings ────────────────────────────
router.put(
  "/settings",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { quarterlyFeePercent, monthlyFeePercent } = req.body;
      const qPct = Math.max(0, parseFloat(quarterlyFeePercent) || 0);
      const mPct = Math.max(0, parseFloat(monthlyFeePercent) || 0);

      await Promise.all([
        prisma.siteContent.upsert({
          where: { key: "quarterly_fee_percent" },
          update: { value: String(qPct) },
          create: {
            key: "quarterly_fee_percent",
            value: String(qPct),
            section: "settings",
          },
        }),
        prisma.siteContent.upsert({
          where: { key: "monthly_fee_percent" },
          update: { value: String(mPct) },
          create: {
            key: "monthly_fee_percent",
            value: String(mPct),
            section: "settings",
          },
        }),
      ]);

      res.json({ quarterlyFeePercent: qPct, monthlyFeePercent: mPct });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  },
);

// ─── EQUIPMENT CRUD ──────────────────────────────────────
// GET /api/admin/equipment
router.get(
  "/equipment",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const [equipment, equipmentText] = await Promise.all([
        prisma.equipment.findFirst({
          where: { isActive: true },
        }),
        prisma.siteContent.findMany({
          where: {
            key: {
              in: [
                "equipment_title",
                "equipment_subtitle",
                "equipment_feature_items",
              ],
            },
          },
        }),
      ]);

      const textMap = equipmentText.reduce<Record<string, string>>(
        (acc, row) => {
          acc[row.key] = row.value;
          return acc;
        },
        {},
      );

      const featureItems = parseEquipmentFeatureItems(
        textMap.equipment_feature_items,
        equipment?.features || [],
      );

      res.json(
        equipment
          ? {
              ...equipment,
              title: textMap.equipment_title || "EQUIPMENTS OVERVIEW",
              subtitle:
                textMap.equipment_subtitle ||
                "Everything You Need For Serious Training Comfort And Result",
              featureItems,
            }
          : {
              id: 0,
              images: [],
              features: [],
              featureItems,
              title: textMap.equipment_title || "EQUIPMENTS OVERVIEW",
              subtitle:
                textMap.equipment_subtitle ||
                "Everything You Need For Serious Training Comfort And Result",
              isActive: true,
            },
      );
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  },
);

// POST /api/admin/equipment (create or update single record)
router.post(
  "/equipment",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        images = [],
        features = [],
        featureItems,
        title = "",
        subtitle = "",
      } = req.body;

      // Ensure arrays are valid
      const validImages = Array.isArray(images)
        ? images.filter((img) => typeof img === "string" && img.trim())
        : [];
      const validFeatures = Array.isArray(features)
        ? features.filter((feat) => typeof feat === "string" && feat.trim())
        : [];
      const validFeatureItems = normalizeEquipmentFeatureItems(
        featureItems,
        validFeatures,
      );

      const cleanTitle =
        typeof title === "string" && title.trim()
          ? title.trim()
          : "EQUIPMENTS OVERVIEW";
      const cleanSubtitle =
        typeof subtitle === "string" && subtitle.trim()
          ? subtitle.trim()
          : "Everything You Need For Serious Training Comfort And Result";

      // Since we only need 1 equipment record, upsert with id = 1
      const [equipment] = await prisma.$transaction([
        prisma.equipment.upsert({
          where: { id: 1 },
          update: {
            images: validImages,
            features: validFeatures,
            updatedAt: new Date(),
          },
          create: {
            id: 1,
            images: validImages,
            features: validFeatureItems
              .map((item) => item.title)
              .filter(Boolean),
            isActive: true,
          },
        }),
        prisma.siteContent.upsert({
          where: { key: "equipment_title" },
          update: { value: cleanTitle },
          create: {
            key: "equipment_title",
            value: cleanTitle,
            section: "about",
          },
        }),
        prisma.siteContent.upsert({
          where: { key: "equipment_subtitle" },
          update: { value: cleanSubtitle },
          create: {
            key: "equipment_subtitle",
            value: cleanSubtitle,
            section: "about",
          },
        }),
        prisma.siteContent.upsert({
          where: { key: "equipment_feature_items" },
          update: { value: JSON.stringify(validFeatureItems) },
          create: {
            key: "equipment_feature_items",
            value: JSON.stringify(validFeatureItems),
            section: "about",
          },
        }),
      ]);

      res.json({
        ...equipment,
        title: cleanTitle,
        subtitle: cleanSubtitle,
        featureItems: validFeatureItems,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save equipment" });
    }
  },
);

// PUT /api/admin/equipment/:id (update specific fields)
router.put(
  "/equipment/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { images, features, featureItems, title, subtitle } = req.body;
      const id = Number(req.params.id) || 1;
      const validFeatures = Array.isArray(features)
        ? features.filter(
            (feat: unknown) => typeof feat === "string" && feat.trim(),
          )
        : [];
      const validFeatureItems =
        featureItems !== undefined || validFeatures.length > 0
          ? normalizeEquipmentFeatureItems(featureItems, validFeatures)
          : undefined;

      const cleanTitle =
        typeof title === "string" && title.trim() ? title.trim() : undefined;
      const cleanSubtitle =
        typeof subtitle === "string" && subtitle.trim()
          ? subtitle.trim()
          : undefined;

      const txOps: Parameters<typeof prisma.$transaction>[0] = [
        prisma.equipment.update({
          where: { id },
          data: {
            ...(images !== undefined ? { images } : {}),
            ...(validFeatureItems !== undefined
              ? {
                  features: validFeatureItems
                    .map((item) => item.title)
                    .filter(Boolean),
                }
              : {}),
            updatedAt: new Date(),
          },
        }),
      ];

      if (cleanTitle !== undefined) {
        txOps.push(
          prisma.siteContent.upsert({
            where: { key: "equipment_title" },
            update: { value: cleanTitle },
            create: {
              key: "equipment_title",
              value: cleanTitle,
              section: "about",
            },
          }),
        );
      }

      if (cleanSubtitle !== undefined) {
        txOps.push(
          prisma.siteContent.upsert({
            where: { key: "equipment_subtitle" },
            update: { value: cleanSubtitle },
            create: {
              key: "equipment_subtitle",
              value: cleanSubtitle,
              section: "about",
            },
          }),
        );
      }

      if (validFeatureItems !== undefined) {
        txOps.push(
          prisma.siteContent.upsert({
            where: { key: "equipment_feature_items" },
            update: { value: JSON.stringify(validFeatureItems) },
            create: {
              key: "equipment_feature_items",
              value: JSON.stringify(validFeatureItems),
              section: "about",
            },
          }),
        );
      }

      const [equipment] = await prisma.$transaction(txOps);

      res.json({
        ...equipment,
        ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
        ...(cleanSubtitle !== undefined ? { subtitle: cleanSubtitle } : {}),
        ...(validFeatureItems !== undefined
          ? { featureItems: validFeatureItems }
          : {}),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update equipment" });
    }
  },
);

export default router;
