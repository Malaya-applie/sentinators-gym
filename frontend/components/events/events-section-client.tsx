"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { EventHighlight, SiteText, getImageUrl } from "@/lib/content";

type Props = {
  highlights: EventHighlight[];
  text: SiteText;
};

type SlideItem = {
  id: number | string;
  image: string;
  title: string;
  description: string;
};

type EventWithDate = EventHighlight & {
  createdAt?: string;
  updatedAt?: string;
};

function getEventTimeValue(item: EventWithDate): number {
  const parsedDate = Date.parse(item.updatedAt || item.createdAt || "");
  if (!Number.isNaN(parsedDate)) return parsedDate;
  return typeof item.id === "number" ? item.id : 0;
}

function toEmbedUrl(url: string): string {
  if (!url) return "";

  try {
    const u = new URL(url);

    if (u.hostname.includes("youtube.com")) {
      const videoId = u.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      if (u.pathname.startsWith("/embed/"))
        return `${url}${url.includes("?") ? "&" : "?"}autoplay=1`;
    }

    if (u.hostname.includes("youtu.be")) {
      const videoId = u.pathname.replace("/", "");
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    if (u.hostname.includes("vimeo.com")) {
      const videoId = u.pathname.split("/").filter(Boolean).pop();
      if (videoId)
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }

    return url;
  } catch {
    return url;
  }
}

export function EventsSectionClient({ highlights, text }: Props) {
  const router = useRouter();
  const [showMainVideo, setShowMainVideo] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mainEvent = useMemo(
    () => highlights.find((e) => e.isMain) ?? highlights[0] ?? null,
    [highlights],
  );

  const secondary = useMemo(
    () => highlights.filter((e) => !e.isMain).slice(0, 4),
    [highlights],
  );

  const latestHighlights = useMemo(() => {
    return [...highlights]
      .sort(
        (a, b) =>
          getEventTimeValue(b as EventWithDate) -
          getEventTimeValue(a as EventWithDate),
      )
      .slice(0, 4);
  }, [highlights]);

  const slides = useMemo<SlideItem[]>(() => {
    return latestHighlights.map((item) => ({
      id: item.id,
      image: getImageUrl(item.image),
      title: item.title || "Upcoming Event",
      description: item.description ?? "Details coming soon",
    }));
  }, [latestHighlights]);

  const activeSlide =
    lightboxIndex !== null && slides[lightboxIndex]
      ? slides[lightboxIndex]
      : null;

  const mainVideoUrl = mainEvent?.videoUrl
    ? toEmbedUrl(mainEvent.videoUrl)
    : "";

  function goPrev() {
    if (lightboxIndex === null || slides.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + slides.length) % slides.length);
  }

  function goNext() {
    if (lightboxIndex === null || slides.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % slides.length);
  }

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLightboxIndex(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, slides.length]);

  return (
    <>
      <section id="events" className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {text.events_section_title || "EVENT HIGHLIGHTS"}
            </h2>
            <p className="text-white/60">
              {text.events_section_subtitle ||
                "Moments that defined the experience"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {/* <div className="md:col-span-1 md:row-span-2">
              <div className="relative h-85 sm:h-105 md:h-full md:min-h-130 rounded-xl overflow-hidden bg-[#1a0a12]/80 backdrop-blur-sm group">
                {mainEvent?.image && (
                  <Image
                    src={getImageUrl(mainEvent.image)}
                    alt={mainEvent.title}
                    fill
                    className="object-cover object-center"
                  />
                )}

                {!showMainVideo && (
                  <>
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent z-10" />
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                      {mainVideoUrl ? (
                        <button
                          type="button"
                          onClick={() => setShowMainVideo(true)}
                          className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors"
                          aria-label="Play main event video"
                        >
                          <Play
                            className="w-6 h-6 text-white ml-1"
                            fill="white"
                          />
                        </button>
                      ) : (
                        <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center opacity-80">
                          <Play
                            className="w-6 h-6 text-white ml-1"
                            fill="white"
                          />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                      <p className="text-white/70 text-sm">
                        {mainEvent?.description ?? ""}
                      </p>
                    </div>
                  </>
                )}

                {showMainVideo && mainVideoUrl && (
                  <div className="absolute inset-0 z-30 bg-black">
                    <button
                      type="button"
                      onClick={() => setShowMainVideo(false)}
                      className="absolute top-3 right-3 z-40 bg-black/70 hover:bg-black/90 text-white rounded-full p-2"
                      aria-label="Close video"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {mainVideoUrl.includes("youtube.com/embed") ||
                    mainVideoUrl.includes("player.vimeo.com") ? (
                      <iframe
                        src={mainVideoUrl}
                        title={mainEvent?.title || "Main event video"}
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <video
                        src={mainVideoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </div>
            </div> */}

            <div className="md:col-span-3 grid grid-cols-2 gap-6">
              {slides.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (typeof item.id === "number") {
                      router.push(`/events/${item.id}`);
                    }
                  }}
                  className="relative aspect-video rounded-xl overflow-hidden bg-[#1a0a12]/80 backdrop-blur-sm group text-left cursor-pointer"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  )}

                  {/* <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                    <p className="text-white/70 text-xs">{item.description}</p>
                  </div> */}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {lightboxIndex !== null && activeSlide && (
        <div
          className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
              {activeSlide.image ? (
                <Image
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                  No image available
                </div>
              )}
            </div>
            <div className="mt-3 text-center px-6">
              <p className="text-white text-sm sm:text-base font-semibold truncate">
                {activeSlide.title}
              </p>
              <p className="text-white/70 text-xs sm:text-sm mt-1 line-clamp-2">
                {activeSlide.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 sm:p-3"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      )}
    </>
  );
}
