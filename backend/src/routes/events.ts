import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── GET /api/events ─────────────────────────────────────
// Public – list all active upcoming events
router.get("/", async (_req, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: "asc" },
      include: {
        _count: { select: { bookings: true } },
        trainer: {
          select: {
            id: true,
            name: true,
            role: true,
            description: true,
            image: true,
          },
        },
      },
    });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ─── POST /api/events/:id/book ────────────────────────────
// Auth required – book an event
router.post(
  "/:id/book",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const eventId = Number(req.params.id);
      const userId = req.userId!;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { _count: { select: { bookings: true } } },
      });

      if (!event || !event.isActive) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      if (event.capacity !== null && event._count.bookings >= event.capacity) {
        res.status(400).json({ error: "Event is fully booked" });
        return;
      }

      const booking = await prisma.eventBooking.create({
        data: { eventId, userId },
        include: {
          event: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      res.status(201).json({ message: "Event booked successfully!", booking });
    } catch (err: any) {
      if (err.code === "P2002") {
        res.status(409).json({ error: "You have already booked this event" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Booking failed" });
    }
  },
);

// ─── DELETE /api/events/:id/book ─────────────────────────
// Auth required – cancel booking
router.delete(
  "/:id/book",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const eventId = Number(req.params.id);
      const userId = req.userId!;

      await prisma.eventBooking.delete({
        where: { eventId_userId: { eventId, userId } },
      });

      res.json({ message: "Booking cancelled" });
    } catch (err: any) {
      if (err.code === "P2025") {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  },
);

// ─── GET /api/events/my-bookings ─────────────────────────
// Auth required – list current user's bookings
router.get(
  "/my-bookings",
  requireAuth,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const bookings = await prisma.eventBooking.findMany({
        where: { userId: req.userId! },
        include: { event: true },
        orderBy: { createdAt: "desc" },
      });
      res.json({ bookings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  },
);

// ─── ADMIN: GET /api/events/admin/list ───────────────────
router.get(
  "/admin/list",
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const events = await prisma.event.findMany({
        orderBy: { date: "asc" },
        include: {
          _count: { select: { bookings: true } },
          trainer: {
            select: {
              id: true,
              name: true,
              role: true,
              description: true,
              image: true,
            },
          },
          bookings: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      res.json({ events });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  },
);

// ─── ADMIN: POST /api/events/admin ───────────────────────
router.post(
  "/admin",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        image,
        date,
        time,
        location,
        capacity,
        trainerId,
      } = req.body;

      if (!title || !date) {
        res.status(400).json({ error: "title and date are required" });
        return;
      }

      const event = await prisma.event.create({
        data: {
          title,
          description: description || null,
          image: image || null,
          date: new Date(date),
          time: time || null,
          location: location || null,
          capacity: capacity ? Number(capacity) : null,
          trainerId: trainerId ? Number(trainerId) : null,
        },
      });
      res.status(201).json({ event });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create event" });
    }
  },
);

// ─── ADMIN: PATCH /api/events/admin/:id ──────────────────
router.patch(
  "/admin/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const {
        title,
        description,
        image,
        date,
        time,
        location,
        capacity,
        isActive,
        trainerId,
      } = req.body;

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(image !== undefined && { image }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(time !== undefined && { time }),
          ...(location !== undefined && { location }),
          ...(capacity !== undefined && {
            capacity: capacity ? Number(capacity) : null,
          }),
          ...(isActive !== undefined && { isActive }),
          ...(trainerId !== undefined && {
            trainerId: trainerId ? Number(trainerId) : null,
          }),
        },
      });
      res.json({ event });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update event" });
    }
  },
);

// ─── ADMIN: DELETE /api/events/admin/:id ─────────────────
router.delete(
  "/admin/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      await prisma.eventBooking.deleteMany({ where: { eventId: id } });
      await prisma.event.delete({ where: { id } });
      res.json({ message: "Event deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete event" });
    }
  },
);

export default router;
