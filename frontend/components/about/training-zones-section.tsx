import { getTrainingZones, getSiteText, getImageUrl } from "@/lib/content";
import React from "react";
import { TrainingZonesGallery } from "./training-zones-gallery";

export async function TrainingZonesSection() {
  const [zones, text] = await Promise.all([
    getTrainingZones(),
    getSiteText("about"),
  ]);

  const display =
    zones.length >= 4
      ? zones.slice(0, 4)
      : [
          {
            id: 0,
            image: "/training-zone-1.png",
            alt: "Cable training",
            order: 0,
          },
          {
            id: 1,
            image: "/training-zone-2.png",
            alt: "Step aerobics",
            order: 1,
          },
          { id: 2, image: "/training-zone-3.png", alt: "Cycling", order: 2 },
          {
            id: 3,
            image: "/training-zone-4.png",
            alt: "Running track",
            order: 3,
          },
        ];

  const galleryImages = display.map((zone, idx) => ({
    src: getImageUrl(zone.image) || `/training-zone-${idx + 1}.png`,
    alt: zone.alt || `Training zone ${idx + 1}`,
  }));

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
            {text.training_zones_title || "TRAINING ZONES"}
          </h2>
          <p className="text-white/70 text-base">
            {text.training_zones_subtitle ||
              "Everything You Need For Serious Training Comfort And Result"}
          </p>
        </div>

        <TrainingZonesGallery images={galleryImages} />
      </div>
    </section>
  );
}
