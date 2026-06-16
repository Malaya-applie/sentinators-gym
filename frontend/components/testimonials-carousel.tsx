"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getImageUrl, type Testimonial } from "@/lib/content";

type TestimonialsCarouselProps = {
  testimonials: Testimonial[];
};

const AUTO_PLAY_DELAY_MS = 5000;
const READ_MORE_THRESHOLD = 190;

export function TestimonialsCarousel({
  testimonials,
}: TestimonialsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(testimonials.length);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAutoPlayStopped, setIsAutoPlayStopped] = useState(false);

  const longReviewIds = useMemo(
    () =>
      testimonials
        .filter((item) => item.content.trim().length > READ_MORE_THRESHOLD)
        .map((item) => item.id),
    [testimonials],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const syncDesktopState = () => setIsDesktop(mediaQuery.matches);

    syncDesktopState();
    mediaQuery.addEventListener("change", syncDesktopState);

    return () => mediaQuery.removeEventListener("change", syncDesktopState);
  }, []);

  useEffect(() => {
    if (!api) return;

    const updateState = () => {
      setActiveIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };

    updateState();
    api.on("select", updateState);
    api.on("reInit", updateState);

    return () => {
      api.off("select", updateState);
      api.off("reInit", updateState);
    };
  }, [api]);

  useEffect(() => {
    if (!api || snapCount <= 1 || isAutoPlayStopped) return;

    const timer = window.setInterval(() => {
      const current = api.selectedScrollSnap();
      const step = isDesktop ? 3 : 1;
      const next = current + step >= snapCount ? 0 : current + step;
      api.scrollTo(next);
    }, AUTO_PLAY_DELAY_MS);

    return () => window.clearInterval(timer);
  }, [api, isAutoPlayStopped, isDesktop, snapCount]);

  const toggleExpanded = (id: number) => {
    setIsAutoPlayStopped(true);
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const groupSize = isDesktop ? 3 : 1;
  const dotCount = Math.max(1, Math.ceil(testimonials.length / groupSize));
  const activeDotIndex = Math.floor(activeIndex / groupSize);

  return (
    <>
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: testimonials.length > groupSize,
          dragFree: false,
          containScroll: "trimSnaps",
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-8">
          {testimonials.map((testimonial) => {
            const isExpanded = expandedIds.includes(testimonial.id);
            const shouldShowReadMore = longReviewIds.includes(testimonial.id);

            return (
              <CarouselItem
                key={testimonial.id}
                className="pl-8 basis-[85%] max-w-[90%] md:basis-1/3 md:max-w-none h-full"
              >
                <div
                  className="relative rounded-xl p-5 sm:p-8 border border-[#733EA6] shadow-[0_0_8px_0_#733EA6] backdrop-blur-sm min-h-72"
                  style={{ background: "#0300044D" }}
                >
                  <div className="flex items-center gap-3 mb-5 sm:mb-8 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden shrink-0">
                      <Image
                        src={
                          getImageUrl(testimonial.image) ||
                          "/trainer-preview.png"
                        }
                        alt={testimonial.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                        <h4 className="text-white font-semibold text-sm sm:text-base truncate shrink-0 max-w-30 sm:max-w-none">
                          {testimonial.name}
                        </h4>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(testimonial.rating)
                                  ? "text-yellow-400"
                                  : "text-white/20"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      <p className="text-white/60 text-sm truncate">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <p
                      className={`text-white/90 text-base leading-relaxed whitespace-pre-line ${
                        isExpanded ? "" : "line-clamp-4"
                      }`}
                    >
                      {testimonial.content}
                    </p>
                  </div>

                  {shouldShowReadMore && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(testimonial.id)}
                      className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      {isExpanded ? "Read less" : "Read more"}
                    </button>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center mt-8 gap-2 flex-wrap">
        {Array.from({ length: dotCount }).map((_, index) => (
          <button
            key={`testimonial-dot-${index}`}
            type="button"
            onClick={() => api?.scrollTo(index * groupSize)}
            aria-label={`Go to testimonial ${index + 1}`}
            disabled={dotCount <= 1}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeDotIndex === index
                ? "w-6 bg-red-500"
                : "w-2 bg-white/50 hover:bg-white/70"
            } ${dotCount <= 1 ? "cursor-default" : "cursor-pointer"}`}
          />
        ))}
      </div>
    </>
  );
}
