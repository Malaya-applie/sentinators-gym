"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type GalleryImage = {
  src: string;
  alt: string;
};

type TrainingZonesGalleryProps = {
  images: GalleryImage[];
};

export function TrainingZonesGallery({ images }: TrainingZonesGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const safeImages = useMemo(
    () => images.filter((item) => Boolean(item.src)),
    [images],
  );

  const openImage = (index: number) => setActiveIndex(index);
  const closeImage = () => setActiveIndex(null);

  const goNext = () => {
    if (activeIndex === null || safeImages.length === 0) return;
    setActiveIndex((activeIndex + 1) % safeImages.length);
  };

  const goPrev = () => {
    if (activeIndex === null || safeImages.length === 0) return;
    setActiveIndex((activeIndex - 1 + safeImages.length) % safeImages.length);
  };

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImage();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex]);

  if (safeImages.length === 0) return null;

  return (
    <>
      <div className="block lg:hidden">
        <div className="space-y-4">
          {safeImages.map((image, idx) => (
            <button
              key={`${image.src}-${idx}`}
              type="button"
              onClick={() => openImage(idx)}
              className="block w-full rounded-2xl overflow-hidden bg-black/20 ring-1 ring-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.3)]"
              aria-label={`Open image ${idx + 1}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={1200}
                height={800}
                className="w-full h-auto object-contain"
                sizes="(max-width: 1024px) 100vw, 1200px"
              />
            </button>
          ))}
        </div>
      </div>

      <div
        className="hidden lg:grid gap-4"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "300px 280px",
        }}
      >
        <button
          type="button"
          onClick={() => openImage(0)}
          className="relative rounded-2xl overflow-hidden"
          style={{ gridColumn: "1", gridRow: "1 / 3" }}
          aria-label="Open first training zone image"
        >
          <Image
            src={safeImages[0]?.src || "/training-zone-1.png"}
            alt={safeImages[0]?.alt || "Training zone"}
            fill
            className="object-cover object-top"
          />
        </button>

        <button
          type="button"
          onClick={() => openImage(1)}
          className="relative rounded-2xl overflow-hidden"
          style={{ gridColumn: "2", gridRow: "1" }}
          aria-label="Open second training zone image"
        >
          <Image
            src={safeImages[1]?.src || "/training-zone-2.png"}
            alt={safeImages[1]?.alt || "Training zone"}
            fill
            className="object-cover object-center"
          />
        </button>

        <button
          type="button"
          onClick={() => openImage(2)}
          className="relative rounded-2xl overflow-hidden"
          style={{ gridColumn: "3", gridRow: "1" }}
          aria-label="Open third training zone image"
        >
          <Image
            src={safeImages[2]?.src || "/training-zone-3.png"}
            alt={safeImages[2]?.alt || "Training zone"}
            fill
            className="object-cover object-center"
          />
        </button>

        <button
          type="button"
          onClick={() => openImage(3)}
          className="relative rounded-2xl overflow-hidden"
          style={{ gridColumn: "2 / 4", gridRow: "2" }}
          aria-label="Open fourth training zone image"
        >
          <Image
            src={safeImages[3]?.src || "/training-zone-4.png"}
            alt={safeImages[3]?.alt || "Training zone"}
            fill
            className="object-cover object-center"
          />
        </button>
      </div>

      {activeIndex !== null ? (
        <div
          className="fixed inset-0 z-100 bg-white/5 backdrop-blur-xl p-4 sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeImage();
          }}
        >
          <button
            type="button"
            onClick={closeImage}
            className="absolute right-4 top-4 z-20 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white hover:bg-white/25"
            aria-label="Close image viewer"
          >
            Close
          </button>

          <div className="relative mx-auto flex h-full w-full max-w-7xl items-center justify-center">
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-2xl leading-none text-white hover:bg-white/25"
              aria-label="Previous image"
            >
              &lt;
            </button>

            <div className="relative h-[80vh] w-full">
              <Image
                src={safeImages[activeIndex].src}
                alt={safeImages[activeIndex].alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            <button
              type="button"
              onClick={goNext}
              className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-2xl leading-none text-white hover:bg-white/25"
              aria-label="Next image"
            >
              &gt;
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
