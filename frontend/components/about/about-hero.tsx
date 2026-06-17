import Image from "next/image";
import { getSiteText, getImageUrl } from "@/lib/content";

export async function AboutHero() {
  const text = await getSiteText("about");

  const bgImage = getImageUrl(text.about_hero_image) || "/about-hero-image.png";

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Fitness background"
          fill
          className="object-cover object-top opacity-60"
          priority
        />
        {/* <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/95" /> */}
        {/* <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black to-transparent" /> */}
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-8 tracking-wide">
          {text.about_hero_title || "WHO WE ARE"}
        </h1>
        <p className="text-white/80 text-base sm:text-lg md:text-xl max-w-5xl mx-auto">
          {text.about_hero_text ||
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit."}
        </p>
      </div>
    </section>
  );
}
