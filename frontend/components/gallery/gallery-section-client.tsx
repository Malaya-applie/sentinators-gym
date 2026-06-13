"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  GalleryImage as GalleryImageType,
  SiteText,
  getImageUrl,
} from "@/lib/content";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

function GalleryImg({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl group cursor-pointer">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 50vw, 25vw"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 rounded-2xl" />
    </div>
  );
}

export function GallerySectionClient({
  initialImages,
  initialText,
  defaultCategories,
}: {
  initialImages: GalleryImageType[];
  initialText: SiteText;
  defaultCategories: string[];
}) {
  const t = useTranslations("gallery");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const getCategoryLabel = (category: string) => {
    const normalized = category.trim().toLowerCase();
    if (normalized === "all") return t("categories.all");
    if (normalized === "events") return t("categories.events");
    if (normalized === "workouts") return t("categories.workouts");
    if (normalized === "training sessions")
      return t("categories.trainingSessions");
    if (normalized === "transformations")
      return t("categories.transformations");
    return category;
  };

  const allCategories = [
    "All",
    ...Array.from(
      new Set(initialImages.map((i) => i.category).filter(Boolean)),
    ),
  ];
  const categories =
    allCategories.length > 1 ? allCategories : defaultCategories;

  const filtered = initialImages.filter(
    (img) => activeCategory === "All" || img.category === activeCategory,
  );

  const visibleImages = activeCategory === "All" ? initialImages : filtered;
  const visibleImagesWithSrc = visibleImages
    .map((img) => ({ ...img, resolvedSrc: getImageUrl(img.src) }))
    .filter((img) => Boolean(img.resolvedSrc?.trim()));

  const pageSize = isDesktop ? 12 : 8;
  const totalPages = Math.max(
    1,
    Math.ceil(visibleImagesWithSrc.length / pageSize),
  );
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedImages = visibleImagesWithSrc.slice(
    startIndex,
    startIndex + pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(null);
  }, [activeCategory]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  const showPrev = () => {
    if (selectedIndex === null || visibleImagesWithSrc.length === 0) return;
    setSelectedIndex(
      (selectedIndex - 1 + visibleImagesWithSrc.length) %
        visibleImagesWithSrc.length,
    );
  };
  const showNext = () => {
    if (selectedIndex === null || visibleImagesWithSrc.length === 0) return;
    setSelectedIndex((selectedIndex + 1) % visibleImagesWithSrc.length);
  };

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, visibleImagesWithSrc.length]);

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white uppercase tracking-wide mb-4">
            {initialText.gallery_section_title || "Gallery"}
          </h1>
          <p className="text-white/50 text-sm max-w-xl mx-auto">
            {initialText.gallery_section_subtitle ||
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
          </p>
        </div>

        <div className="w-full mb-10">
          <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 sm:gap-1 justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${
                      isActive
                        ? "bg-[#7a1f2e] text-white border border-[#7a1f2e]"
                        : "bg-transparent text-white border border-white/60 hover:text-white hover:border-white"
                    }
                  `}
                  style={{
                    minWidth: "auto",
                  }}
                >
                  {getCategoryLabel(cat)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {paginatedImages.map((img, index) => (
              <button
                key={img.id}
                type="button"
                className="aspect-square text-left"
                onClick={() => openLightbox(startIndex + index)}
                aria-label={`Open ${img.alt}`}
              >
                <GalleryImg src={img.resolvedSrc} alt={img.alt} />
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 text-white">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-full border border-white/40 hover:border-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              <span className="text-sm text-white/80 min-w-24 text-center">
                Page {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-full border border-white/40 hover:border-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedIndex !== null && visibleImagesWithSrc[selectedIndex] && (
        <div
          className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-3 sm:p-6"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/90 hover:text-white text-3xl leading-none"
            aria-label="Close image"
          >
            ×
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white text-3xl sm:text-4xl leading-none w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 border border-white/25 flex items-center justify-center select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            aria-label="Previous image"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            ‹
          </button>

          <div
            className="relative w-full max-w-5xl h-[65vh] sm:h-[75vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={visibleImagesWithSrc[selectedIndex].resolvedSrc}
              alt={visibleImagesWithSrc[selectedIndex].alt}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 text-white hover:text-white text-3xl sm:text-4xl leading-none w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/55 border border-white/25 flex items-center justify-center select-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
            aria-label="Next image"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
