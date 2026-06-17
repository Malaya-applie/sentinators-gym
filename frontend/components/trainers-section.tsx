"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getTrainers,
  getSiteText,
  getImageUrl,
  type Trainer,
  type SiteText,
} from "@/lib/content";

export function TrainersSection() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [text, setText] = useState<SiteText>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const trainersPerPage = 4;

  useEffect(() => {
    async function fetchData() {
      const [trainersData, textData] = await Promise.all([
        getTrainers(),
        getSiteText("trainers"),
      ]);
      setTrainers(trainersData);
      setText(textData);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="py-5 bg-transparent" />;
  }

  const totalPages = Math.ceil(trainers.length / trainersPerPage);
  const startIndex = currentPage * trainersPerPage;
  const preview = trainers.slice(startIndex, startIndex + trainersPerPage);

  return (
    <section className="py-5 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {text.trainers_section_title || "TRAINERS PREVIEW"}
          </h2>
          <p className="text-white/60 text-sm max-w-2xl mx-auto">
            {text.trainers_section_subtitle ||
              "At This Part You Can Easily Access All Of Our Services. Take A Look At Them And Chose Wish Ever You Want."}
          </p>
        </div>

        <div
          className={`
            flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar
            sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 sm:hide-scrollbar-none mt-12
          `}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {preview.map((trainer, index) => (
            <div
              key={trainer.id}
              className="group relative rounded-xl overflow-hidden bg-[#1a0a12]/80 aspect-3/4 backdrop-blur-sm min-w-[85vw] max-w-[90vw] sm:min-w-0 sm:max-w-none snap-center"
              style={{ flex: "0 0 auto" }}
            >
              <Image
                src={getImageUrl(trainer.image) || "/trainer-preview.png"}
                alt={trainer.name}
                fill
                style={{ objectFit: "cover" }}
                className="absolute inset-0 w-full h-full object-cover z-0"
                sizes="(max-width: 768px) 100vw, 25vw"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent z-10" />
              <div className="absolute inset-0" />
              <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <h3 className="text-white font-semibold">{trainer.name}</h3>
                <p className="text-white/60 text-sm">{trainer.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center items-center gap-3 mt-8">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`transition-all duration-300 ${
                currentPage === index
                  ? "w-8 h-2 bg-red-500 rounded-full"
                  : "w-2 h-2 bg-white/30 rounded-full hover:bg-white/50"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        <div className="text-center mt-10 mb-10">
          {/* <Button
            variant="outline"
            className=" text-red-500 hover:bg-red-500 hover:text-white btn-gradient"
          >
            Show more
          </Button> */}
        </div>
      </div>
    </section>
  );
}
