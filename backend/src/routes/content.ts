import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseEquipmentFeatureItems } from "../lib/equipmentFeatureItems";

const router = Router();

// ─── GET /api/content/text/:section ─────────────────────
// Returns all SiteContent rows for a section as { key: value } map
router.get(
  "/text/:section",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rows = await prisma.siteContent.findMany({
        where: { section: req.params.section as string },
      });
      const map: Record<string, string> = {};
      rows.forEach((r) => (map[r.key] = r.value));
      res.json(map);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  },
);

// ─── GET /api/content/text ─────────────────────────────
// Returns all SiteContent as { key: value } map
router.get("/text", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await prisma.siteContent.findMany();
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// ─── GET /api/content/stats ─────────────────────────────
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await prisma.stat.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── GET /api/content/trainers ──────────────────────────
router.get("/trainers", async (_req: Request, res: Response): Promise<void> => {
  try {
    const trainers = await prisma.trainer.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json(trainers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trainers" });
  }
});

// ─── GET /api/content/testimonials ─────────────────────
router.get(
  "/testimonials",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const testimonials = await prisma.testimonial.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(testimonials);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch testimonials" });
    }
  },
);

// ─── GET /api/content/blog ──────────────────────────────
router.get("/blog", async (_req: Request, res: Response): Promise<void> => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

// ─── GET /api/content/blog/:id ──────────────────────────
router.get("/blog/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post || !post.isActive) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

// ─── GET /api/content/gallery ───────────────────────────
router.get("/gallery", async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "";

    const where = {
      isActive: true,
      ...(category && category.toLowerCase() !== "all" ? { category } : {}),
    };

    const total = await prisma.galleryImage.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const images = await prisma.galleryImage.findMany({
      where,
      orderBy: { order: "asc" },
      skip: (safePage - 1) * limit,
      take: limit,
    });

    res.json({
      images,
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
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

// ─── GET /api/content/gallery-categories ───────────────
router.get(
  "/gallery-categories",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await prisma.galleryCategory.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(categories);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch gallery categories" });
    }
  },
);

// ─── GET /api/content/achievements ─────────────────────
router.get(
  "/achievements",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const achievements = await prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(achievements);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  },
);

// ─── GET /api/content/why-choose-us ────────────────────
router.get(
  "/why-choose-us",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const features = await prisma.whyChooseUsFeature.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(features);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch features" });
    }
  },
);

// ─── GET /api/content/event-highlights ─────────────────
router.get(
  "/event-highlights",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await prisma.eventHighlight.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(events);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  },
);

// ─── GET /api/content/training-zones ───────────────────
router.get(
  "/training-zones",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const zones = await prisma.trainingZone.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
      res.json(zones);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch training zones" });
    }
  },
);

// ─── GET /api/content/all ──────────────────────────────
// Returns everything in one request (used for first page load)
router.get("/all", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      textRows,
      stats,
      trainers,
      testimonials,
      blog,
      gallery,
      achievements,
      whyFeatures,
      eventHighlights,
      trainingZones,
    ] = await Promise.all([
      prisma.siteContent.findMany(),
      prisma.stat.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.trainer.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.testimonial.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.blogPost.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.galleryImage.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.achievement.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.whyChooseUsFeature.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.eventHighlight.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      prisma.trainingZone.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
    ]);

    const text: Record<string, string> = {};
    textRows.forEach((r) => (text[r.key] = r.value));

    res.json({
      text,
      stats,
      trainers,
      testimonials,
      blog,
      gallery,
      achievements,
      whyFeatures,
      eventHighlights,
      trainingZones,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch all content" });
  }
});

// ─── GET /api/content/faqs ──────────────────────────────
router.get("/faqs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const faqs = await prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, question: true, answer: true, order: true },
    });
    res.json(faqs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch FAQs" });
  }
});

// ─── GET /api/content/plan-categories ──────────────────
router.get(
  "/plan-categories",
  async (_req: Request, res: Response): Promise<void> => {
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

// ─── GET /api/content/settings ─────────────────────────
// Returns instalment fee percentages (public, read-only)
router.get("/settings", async (_req: Request, res: Response): Promise<void> => {
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
});

// ─── GET /api/content/equipment ────────────────────────
router.get(
  "/equipment",
  async (_req: Request, res: Response): Promise<void> => {
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
              createdAt: new Date(),
              updatedAt: new Date(),
            },
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  },
);

export default router;
