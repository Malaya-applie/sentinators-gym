import type { Testimonial } from "@/lib/content";
import { getTestimonials, getSiteText } from "@/lib/content";
import { TestimonialsCarousel } from "./testimonials-carousel";

export async function TestimonialsSection() {
  const [testimonials, text] = await Promise.all([
    getTestimonials(),
    getSiteText("testimonials"),
  ]);

  const display: Testimonial[] =
    testimonials.length > 0
      ? testimonials
      : [
          {
            id: 0,
            name: "Lorem ipsum",
            role: "Lorem",
            rating: 4.5,
            image: "/trainer-preview.png",
            content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            order: 0,
          },
        ];

  return (
    <section className="bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {text.testimonials_section_title || "TESTIMONIALS"}
          </h2>
          <p className="text-white/60">
            {text.testimonials_section_subtitle ||
              "Real stories from people who transformed their lives"}
          </p>
        </div>

        <TestimonialsCarousel testimonials={display} />
      </div>
    </section>
  );
}
