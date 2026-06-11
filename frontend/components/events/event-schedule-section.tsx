"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEvents,
  fetchMyBookings,
  clearEventMessages,
} from "@/store/slices/eventsSlice";
import { MapPin, Clock, Users, CheckCircle2 } from "lucide-react";

const UPLOADS_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace("/api", "");

function eventImageSrc(image?: string | null): string {
  if (!image) return "/event-image.jpg";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${UPLOADS_BASE}${image}`;
  return image;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function EventScheduleSection() {
  const dispatch = useAppDispatch();
  const { events, myBookedEventIds, loading, error, successMessage } =
    useAppSelector((s) => s.events);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchEvents());
    if (user) dispatch(fetchMyBookings());
  }, [dispatch, user]);

  // Auto-clear messages after 3s
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => dispatch(clearEventMessages()), 3000);
    return () => clearTimeout(t);
  }, [successMessage, dispatch]);

  return (
    <section className="py-20 bg-transparent">
      {/* Login Alert */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-wide">
            FOLLOW EVENT SCHEDULE
          </h2>
          <p className="text-white/60 text-base">
            Moments that define the experience
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-white/40 text-center py-12">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="text-white/30 text-center py-12">
            No upcoming events yet.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {events.map((event) => {
              const isBooked = myBookedEventIds.includes(event.id);
              const isFull =
                event.capacity != null &&
                event._count.bookings >= event.capacity;

              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/10 flex flex-col sm:flex-row items-center gap-6 px-6 py-5"
                  style={{ background: "#0300044D" }}
                >
                  {/* Title + Description */}
                  <div className="w-full sm:w-48 shrink-0">
                    <h3 className="text-white text-xl font-semibold mb-1">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-white/60 text-sm leading-relaxed line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Image */}
                  <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden shrink-0 relative bg-black/30">
                    <Image
                      src={eventImageSrc(event.image)}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Meta */}
                  <ul className="text-white/70 text-sm space-y-1.5 shrink-0 min-w-35">
                    <li className="flex items-center gap-2">
                      <Clock size={13} className="text-purple-400 shrink-0" />
                      {event.time ? `${event.time}, ` : ""}
                      {formatDate(event.date)}
                    </li>
                    {event.location && (
                      <li className="flex items-center gap-2">
                        <MapPin
                          size={13}
                          className="text-purple-400 shrink-0"
                        />
                        {event.location}
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <Users size={13} className="text-purple-400 shrink-0" />
                      {event._count.bookings} booked
                      {event.capacity !== null && ` / ${event.capacity}`}
                    </li>
                  </ul>

                  {/* Button */}
                  {isBooked ? (
                    <Link
                      href={`/events/${event.id}`}
                      className="flex items-center gap-1.5 text-green-400 text-sm font-semibold shrink-0 hover:text-green-300 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Booked
                    </Link>
                  ) : (
                    <Link
                      href={`/events/${event.id}`}
                      className={`btn-gradient text-white font-semibold px-6 py-2.5 rounded-lg text-sm shrink-0 transition-opacity ${isFull ? "opacity-50 pointer-events-none" : "hover:opacity-90"}`}
                    >
                      {isFull ? "Full" : "Join Now"}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
