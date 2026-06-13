"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeCategory, setActiveCategory] = useState("All");

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

  const gridItems = initialImages.filter((img) => img.gridCol && img.gridRow);

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
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {activeCategory === "All" ? (
          isDesktop ? (
            <div
              className="w-full"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gridTemplateRows: "200px 200px 200px",
                gap: "12px",
              }}
            >
              {gridItems.map((item) => (
                <div
                  key={item.id}
                  style={{ gridColumn: item.gridCol!, gridRow: item.gridRow! }}
                >
                  <GalleryImg src={getImageUrl(item.src)} alt={item.alt} />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gridItems.map((img) => (
                <div key={img.id} className="aspect-square">
                  <GalleryImg src={getImageUrl(img.src)} alt={img.alt} />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((img) => (
              <div key={img.id} className="aspect-square">
                <GalleryImg src={getImageUrl(img.src)} alt={img.alt} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
