import Image from "next/image";
import { getImageUrl, getSiteText } from "@/lib/content";

export async function ShopHero() {
  const text = await getSiteText("shop");
  const bgImage = getImageUrl(text.shop_hero_image) || "/shop-hero-image.jpg";
  const heading = text.shop_hero_title || "LOREM IPSUM\nLOREM IPSUM LOREM";
  const headingLines = heading.split("\n").filter((line) => line.trim());

  return (
    <section className="relative h-[42vh] min-h-[280px] sm:h-[50vh] sm:min-h-[320px] lg:h-[55vh] lg:min-h-[360px] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Shop hero"
          fill
          className="object-cover object-center opacity-80"
          priority
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-8 lg:px-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4 sm:mb-6 tracking-wide max-w-3xl">
          {headingLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < headingLines.length - 1 && <br />}
            </span>
          ))}
        </h1>
        {/* <Button className="btn-gradient text-white font-semibold px-6">
          Shop Know
        </Button> */}
      </div>
    </section>
  );
}
