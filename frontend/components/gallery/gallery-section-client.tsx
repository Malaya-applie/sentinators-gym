"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  GalleryImage as GalleryImageType,
  GalleryPagination,
  SiteText,
  getGalleryImages,
  getImageUrl,
} from "@/lib/content";

const PAGE_SIZE = 8;
const ALL_CATEGORY = "__ALL__";
const ALL_CATEGORY_LABEL = "All";

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
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 rounded-2xl" />
    </div>
  );
}

export function GallerySectionClient({
  initialImages,
  initialText,
  initialCategories,
  initialPagination,
}: {
  initialImages: GalleryImageType[];
  initialText: SiteText;
  initialCategories: string[];
  initialPagination: GalleryPagination;
}) {
  const t = useTranslations("gallery");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [images, setImages] = useState(initialImages);
  const [pagination, setPagination] = useState(initialPagination);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const getCategoryLabel = (category: string) => {
    const normalized = category.trim().toLowerCase();
    if (normalized === ALL_CATEGORY.toLowerCase()) return t("categories.all");
    if (normalized === "events") return t("categories.events");
    if (normalized === "workouts") return t("categories.workouts");
    if (normalized === "training sessions")
      return t("categories.trainingSessions");
    if (normalized === "transformations")
      return t("categories.transformations");
    return category;
  };

  const categories =
    initialCategories.length > 0 ? initialCategories : [ALL_CATEGORY_LABEL];

  const visibleImagesWithSrc = images
    .map((img) => ({ ...img, resolvedSrc: getImageUrl(img.src) }))
    .filter((img) => Boolean(img.resolvedSrc?.trim()));

  const totalPages = pagination.totalPages;

  useEffect(() => {
    setImages(initialImages);
    setPagination(initialPagination);
  }, [initialImages, initialPagination]);

  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      setIsLoading(true);
      try {
        const response = await getGalleryImages({
          page: currentPage,
          limit: PAGE_SIZE,
          category:
            activeCategory === ALL_CATEGORY ? undefined : activeCategory,
        });
        if (cancelled) return;
        setImages(response.images);
        setPagination(response.pagination);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (
      !(
        currentPage === 1 &&
        activeCategory === ALL_CATEGORY &&
        images === initialImages
      )
    ) {
      void loadGallery();
    }

    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(null);
  }, [activeCategory]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = 0;

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
              const isAllCategory = cat.trim().toLowerCase() === "all";
              const isActive =
                activeCategory === (isAllCategory ? ALL_CATEGORY : cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(isAllCategory ? ALL_CATEGORY : cat);
                    setCurrentPage(1);
                    setSelectedIndex(null);
                  }}
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
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-10 rounded-2xl sm:rounded-3xl bg-[#0b0006]/80 backdrop-blur-sm border border-[#7a1f2e]/20 overflow-hidden shadow-[0_0_30px_rgba(122,31,46,0.12)]">
                <div className="absolute inset-0 bg-linear-to-br from-transparent via-[#7a1f2e]/8 to-transparent" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 pt-4 pb-3">
                  <div className="space-y-2 max-w-full sm:max-w-md">
                    <div className="h-4 w-32 sm:w-40 rounded-full bg-[#7a1f2e]/35 animate-pulse" />
                    <div className="h-3 w-48 sm:w-60 rounded-full bg-white/8 animate-pulse" />
                  </div>
                  <div className="inline-flex w-fit rounded-full border border-[#7a1f2e]/30 bg-[#7a1f2e]/15 px-3 py-1 text-[11px] sm:text-xs text-white/80">
                    Loading...
                  </div>
                </div>
                <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4">
                  {Array.from({ length: isDesktop ? PAGE_SIZE : 6 }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-xl sm:rounded-2xl border border-[#7a1f2e]/15 bg-[linear-gradient(135deg,rgba(122,31,46,0.18),rgba(255,255,255,0.02))] animate-pulse overflow-hidden"
                      >
                        <div className="h-full w-full bg-linear-to-tr from-[#7a1f2e]/20 via-transparent to-white/5" />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 transition-opacity duration-300 ${
                isLoading ? "opacity-20 blur-[1px]" : "opacity-100"
              }`}
            >
              {visibleImagesWithSrc.length > 0 ? (
                visibleImagesWithSrc.map((img, index) => (
                  <button
                    key={img.id}
                    type="button"
                    className="aspect-square text-left"
                    onClick={() => openLightbox(startIndex + index)}
                    aria-label={`Open ${img.alt}`}
                    disabled={isLoading}
                  >
                    <GalleryImg src={img.resolvedSrc} alt={img.alt} />
                  </button>
                ))
              ) : isLoading ? (
                Array.from({ length: isDesktop ? PAGE_SIZE : 6 }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-xl sm:rounded-2xl bg-[#7a1f2e]/10 animate-pulse border border-[#7a1f2e]/15"
                    />
                  ),
                )
              ) : (
                <div className="col-span-full py-16 text-center text-white/55">
                  No images found for this category.
                </div>
              )}
            </div>

            {totalPages > 1 && currentPage > 1 && (
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                // className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/25 flex items-center justify-center text-white hover:bg-black/80 hover:border-white/50 transition-all outline-none focus:outline-none"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 xl:-translate-x-16 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/25 flex items-center justify-center text-white hover:bg-black/80 hover:border-white/50 transition-all outline-none focus:outline-none"
                aria-label="Previous page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {totalPages > 1 && currentPage < totalPages && (
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                // className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/25 flex items-center justify-center text-white hover:bg-black/80 hover:border-white/50 transition-all outline-none focus:outline-none"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 xl:translate-x-16 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 border border-white/25 flex items-center justify-center text-white hover:bg-black/80 hover:border-white/50 transition-all outline-none focus:outline-none"
                aria-label="Next page"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 sm:w-6 sm:h-6"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
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
