import Image from "next/image";
import { getImageUrl, getSiteText } from "@/lib/content";

export async function MembershipHero() {
  const text = await getSiteText("membership");
  const heading = text.membership_hero_title || "PLANS & PRICING";
  const backgroundImage =
    getImageUrl(text.membership_hero_image) || "/pricing-hero-image.png";

  return (
    <section className="relative min-h-screen flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={backgroundImage}
          alt="Plans & Pricing background"
          fill
          className="object-cover object-center opacity-60"
          priority
        />
        {/* <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/95" />
        <div className="absolute bottom-0 left-0 right-0 h-60 bg-linear-to-t from-black to-transparent" /> */}
      </div>

      <div className="relative z-10 w-full flex items-center justify-center text-center px-4">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-wide">
          {heading}
        </h1>
      </div>
    </section>
  );
}
