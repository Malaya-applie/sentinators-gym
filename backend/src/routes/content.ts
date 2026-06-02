import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

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
router.get("/gallery", async (_req: Request, res: Response): Promise<void> => {
  try {
    const images = await prisma.galleryImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gallery" });
  }
});

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

export default router;
