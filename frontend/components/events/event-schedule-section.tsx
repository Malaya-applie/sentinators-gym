"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/api";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [sectionText, setSectionText] = useState({
    title: "FOLLOW EVENT SCHEDULE",
    subtitle: "Moments that define the experience",
  });
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const EVENTS_PER_PAGE = 4;

  useEffect(() => {
    dispatch(fetchEvents());
    if (user) dispatch(fetchMyBookings());

    api
      .get("/content/text/events_page")
      .then((res) => {
        const data = res.data as Record<string, string>;
        setSectionText({
          title: data.events_schedule_title || "FOLLOW EVENT SCHEDULE",
          subtitle:
            data.events_schedule_subtitle ||
            "Moments that define the experience",
        });
      })
      .catch(() => {});
  }, [dispatch, user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

  // Auto-clear messages after 3s
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => dispatch(clearEventMessages()), 3000);
    return () => clearTimeout(t);
  }, [successMessage, dispatch]);

  const totalPages = Math.max(1, Math.ceil(events.length / EVENTS_PER_PAGE));
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
    return events.slice(startIndex, startIndex + EVENTS_PER_PAGE);
  }, [currentPage, events]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function changePage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <section className="py-20 bg-transparent">
      {/* Login Alert */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={listTopRef} />
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-wide">
            {sectionText.title}
          </h2>
          <p className="text-white/60 text-base">{sectionText.subtitle}</p>
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
          <>
            <div className="flex flex-col gap-5">
              {paginatedEvents.map((event) => {
                const isBooked = myBookedEventIds.includes(event.id);
                const isFull =
                  event.capacity != null &&
                  event._count.bookings >= event.capacity;

                return (
                  <div
                    key={event.id}
                    className="rounded-xl border border-white/10 px-4 py-4 sm:px-6 sm:py-5"
                    style={{ background: "#0300044D" }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                      {/* Title + Description */}
                      <div className="w-full min-w-0 sm:w-52 lg:w-60 shrink-0">
                        <h3 className="text-white text-xl font-semibold mb-1 wrap-break-word line-clamp-3">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-white/60 text-sm leading-relaxed wrap-break-word line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Image */}
                      <div className="w-full sm:w-40 lg:w-52 shrink-0">
                        <div className="relative h-28 lg:h-32 w-full rounded-xl overflow-hidden bg-black/30">
                          <Image
                            src={eventImageSrc(event.image)}
                            alt={event.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 160px, 208px"
                            className="object-cover object-center"
                          />
                        </div>
                      </div>

                      {/* Meta */}
                      <ul className="text-white/70 text-sm space-y-2 min-w-0 sm:flex-1">
                        <li className="flex items-start gap-2">
                          <Clock
                            size={13}
                            className="text-purple-400 shrink-0 mt-1"
                          />
                          <span className="wrap-break-word">
                            {event.time ? `${event.time}, ` : ""}
                            {formatDate(event.date)}
                          </span>
                        </li>
                        {event.location && (
                          <li className="flex items-start gap-2">
                            <MapPin
                              size={13}
                              className="text-purple-400 shrink-0 mt-1"
                            />
                            <span className="wrap-break-word">
                              {event.location}
                            </span>
                          </li>
                        )}
                        <li className="flex items-start gap-2">
                          <Users
                            size={13}
                            className="text-purple-400 shrink-0 mt-1"
                          />
                          <span className="wrap-break-word">
                            {event._count.bookings} booked
                            {event.capacity !== null && ` / ${event.capacity}`}
                          </span>
                        </li>
                      </ul>

                      {/* Button */}
                      <div className="w-full sm:w-auto sm:shrink-0 sm:ml-auto">
                        {isBooked ? (
                          <Link
                            href={`/events/${event.id}`}
                            className="inline-flex w-full justify-center sm:w-auto items-center gap-1.5 text-green-400 text-sm font-semibold hover:text-green-300 transition-colors"
                          >
                            <CheckCircle2 size={16} />
                            Booked
                          </Link>
                        ) : (
                          <Link
                            href={`/events/${event.id}`}
                            className={`inline-flex w-full justify-center sm:w-auto btn-gradient text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-opacity ${isFull ? "opacity-50 pointer-events-none" : "hover:opacity-90"}`}
                          >
                            {isFull ? "Ausgebucht" : "Jetzt anmelden"}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => changePage(page)}
                      className={`h-10 min-w-10 rounded-md border px-3 text-sm font-semibold transition ${
                        currentPage === page
                          ? "border-red-500 bg-red-700 text-white"
                          : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => changePage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
