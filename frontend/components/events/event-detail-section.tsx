"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEvents,
  fetchMyBookings,
  bookEvent,
  cancelBooking,
  clearEventMessages,
  GymEvent,
} from "@/store/slices/eventsSlice";
import {
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const UPLOADS_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace("/api", "");

function eventImageSrc(image?: string | null): string {
  if (!image) return "/event-hero-image.jpg";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${UPLOADS_BASE}${image}`;
  return image;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  eventId: string;
}

export function EventDetailSection({ eventId }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    events,
    myBookedEventIds,
    loading,
    bookingLoading,
    error,
    successMessage,
  } = useAppSelector((s) => s.events);
  const { user } = useAppSelector((s) => s.auth);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const id = parseInt(eventId, 10);
  const event: GymEvent | undefined = events.find((e) => e.id === id);

  useEffect(() => {
    if (events.length === 0) dispatch(fetchEvents());
    if (user) dispatch(fetchMyBookings());
  }, [dispatch, user]);

  // Auto-clear messages after 3s
  useEffect(() => {
    if (!successMessage && !error) return;
    const t = setTimeout(() => dispatch(clearEventMessages()), 3000);
    return () => clearTimeout(t);
  }, [successMessage, error, dispatch]);

  const isBooked = myBookedEventIds.includes(id);
  const isFull =
    event?.capacity != null && event._count.bookings >= event.capacity;
  const isLoadingThis = bookingLoading === id;

  const handleBook = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    dispatch(bookEvent(id));
  };

  const handleCancel = () => {
    dispatch(cancelBooking(id));
  };

  // Show loading while fetching OR while events haven't loaded yet at all (initial state)
  const notYetFetched = events.length === 0 && !error;
  if (loading || (notYetFetched && !event)) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center">
        <p className="text-white/40 text-lg">Loading event…</p>
      </section>
    );
  }

  // Only show "not found" once we know events have been fetched
  if (!event) {
    return (
      <section className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-lg">Event not found.</p>
        <button
          onClick={() => router.push("/events")}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={14} /> Back to Events
        </button>
      </section>
    );
  }

  return (
    <>
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 p-8 flex flex-col gap-5"
            style={{ background: "#0d0014cc" }}
          >
            <div className="flex justify-center">
              <Image
                src="/gym_logo.png"
                alt="Sentinators"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
            <h3 className="text-xl font-extrabold text-white tracking-wide text-center">
              LOGIN REQUIRED
            </h3>
            <div
              className="w-full h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #7C3AED88, transparent)",
              }}
            />
            <p className="text-white/70 text-sm text-center">
              Please log in to book this event.
            </p>
            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative min-h-[75vh] flex items-end pb-16">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/event-hero-image.jpg"
            alt={event?.title ?? "Event"}
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-purple-950/50 mix-blend-multiply" />
          <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/90" />
        </div>

        {/* Back button */}
        <button
          onClick={() => router.push("/events")}
          className="absolute top-8 left-6 sm:left-10 z-10 flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Alle Events
        </button>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 sm:px-8 lg:px-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-wide mb-12 uppercase">
            {event?.title}
          </h1>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-5 tracking-wide">
            Eventübersicht
          </h2>
          <div className="space-y-2.5 text-white text-sm sm:text-base">
            {event?.time && (
              <p className="flex items-center gap-2">
                <Clock size={15} className="text-purple-400 shrink-0" />
                <span>
                  <span className="font-bold">Uhrzeit:</span> {event.time}
                </span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <CalendarDays size={15} className="text-purple-400 shrink-0" />
              <span>
                <span className="font-bold">Datum:</span>{" "}
                {formatDate(event!.date)}
              </span>
            </p>
            {event?.location && (
              <p className="flex items-center gap-2">
                <MapPin size={15} className="text-purple-400 shrink-0" />
                <span>
                  <span className="font-bold">Ort:</span> {event.location}
                </span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Users size={15} className="text-purple-400 shrink-0" />
              <span>
                <span className="font-bold">Plätze:</span>{" "}
                {event!._count.bookings} Gebucht
                {event?.capacity != null && ` / ${event.capacity} Gesamt`}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 bg-transparent">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col gap-6">
          {/* Toast messages */}
          {successMessage && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-lg">
              <PackageCheck size={16} />
              {successMessage}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Description */}
          {event?.description && (
            <div
              className="rounded-xl border border-white/10 p-8"
              style={{ background: "#0300044D" }}
            >
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-5 tracking-wide">
                Eventbeschreibung
              </h3>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Trainer + Register Row */}
          <div
            className={`grid gap-6 ${event?.trainer ? "md:grid-cols-2" : ""}`}
          >
            {/* Trainer Card — only when a trainer is assigned */}
            {event?.trainer && (
              <div
                className="rounded-xl border border-white/10 p-8 flex flex-col justify-between"
                style={{ background: "#0300044D" }}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <h3 className="text-3xl font-extrabold text-white tracking-wide uppercase">
                    {event.trainer.name}
                  </h3>
                  {event.trainer.image && (
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 relative">
                      <Image
                        src={
                          event.trainer.image.startsWith("http")
                            ? event.trainer.image
                            : event.trainer.image.startsWith("/uploads/")
                              ? `${UPLOADS_BASE}${event.trainer.image}`
                              : event.trainer.image
                        }
                        alt={event.trainer.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">
                    {event.trainer.role}
                  </p>
                  {event.trainer.description && (
                    <p className="text-white/60 text-sm leading-relaxed">
                      {event.trainer.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Register Card */}
            <div
              className="rounded-xl border border-white/10 p-10 flex flex-col items-center justify-center text-center gap-5"
              style={{ background: "#0300044D" }}
            >
              <h3 className="text-3xl font-extrabold text-white tracking-wide">
                {isBooked ? "Du bist angemeldet!" : "Jetzt anmelden"}
              </h3>
              <div
                className="w-full h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #7C3AED88, transparent)",
                }}
              />

              {isBooked ? (
                <>
                  <div className="flex items-center gap-2 text-green-400 text-base font-semibold">
                    <CheckCircle2 size={20} />
                    Your spot is confirmed!
                  </div>
                  <p className="text-white/60 text-sm">
                    We'll see you at the event. Check your email for details.
                  </p>
                  <button
                    onClick={handleCancel}
                    disabled={isLoadingThis}
                    className="text-sm text-white/30 hover:text-red-400 transition-colors underline underline-offset-2 disabled:opacity-50"
                  >
                    {isLoadingThis ? "Cancelling…" : "Cancel my booking"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white/80 text-lg">
                    {isFull
                      ? "Sorry, this event is fully booked."
                      : event?.capacity != null
                        ? `Beeil dich! Nur ${
                            event.capacity - event._count.bookings
                          } Plätze verfügbar.`
                        : "Secure your spot today."}
                  </p>
                  <Button
                    onClick={handleBook}
                    disabled={isFull || isLoadingThis}
                    className="btn-gradient text-white font-semibold px-10 py-5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingThis
                      ? "Booking…"
                      : isFull
                        ? "Ausgebucht"
                        : "Meinen Platz sichern"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
