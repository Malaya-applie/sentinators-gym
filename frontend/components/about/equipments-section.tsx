import Image from "next/image";
import { getEquipment, getImageUrl } from "@/lib/content";

const GRAD = "linear-gradient(180deg, #733EA6 0%, #49225B 100%)";

function GradientBorderImage({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute"
      style={{
        ...style,
        padding: "2px",
        background: GRAD,
        borderRadius: "12px",
      }}
    >
      <div className="relative w-full h-full rounded-[10px] overflow-hidden">
        <Image src={src} alt={alt} fill className="object-cover" />
      </div>
    </div>
  );
}

export async function EquipmentsSection() {
  const equipment = await getEquipment();
  const title = equipment?.title?.trim() || "EQUIPMENTS OVERVIEW";
  const subtitle =
    equipment?.subtitle?.trim() ||
    "Everything You Need For Serious Training Comfort And Result";
  const images = (equipment?.images || [])
    .filter((img) => img)
    .map((img) => getImageUrl(img))
    .slice(0, 4);
  const features = equipment?.features || [];

  // Fallback images if empty
  const displayImages =
    images.length > 0
      ? images
      : [
          "/equipment-1.png",
          "/equipment-2.png",
          "/equipment-3.png",
          "/equipment-4.png",
        ];

  // Fallback features if empty
  const displayFeatures =
    features.length > 0
      ? features
      : [
          "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
          "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
        ];

  return (
    <section className="mt-10 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
            {title}
          </h2>
          <p className="text-white/70 text-base">{subtitle}</p>
        </div>

        <div className="flex flex-col-reverse md:flex-row items-center gap-12">
          {/* Left – Feature cards */}
          <div className="w-full md:w-[38%] shrink-0 mt-8 md:mt-0">
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 md:gap-5">
              {displayFeatures.map((feature, idx) => (
                <li
                  key={idx}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3.5 text-[15px] leading-relaxed text-gray-100"
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1"
                    style={{ background: GRAD }}
                  />
                  <div className="pl-3">{feature}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right – Mobile slider + desktop staggered images */}
          <div className="w-full md:flex-1">
            <div className="md:hidden -mx-1">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {displayImages.map((image, idx) => (
                  <div
                    key={image + idx}
                    className="snap-center shrink-0 w-[82%] sm:w-[68%]"
                  >
                    <div
                      className="relative rounded-xl overflow-hidden"
                      style={{
                        padding: "2px",
                        background: GRAD,
                      }}
                    >
                      <div className="relative aspect-16/10 rounded-[10px] overflow-hidden bg-black/30">
                        <Image
                          src={image}
                          alt={`Equipment image ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="hidden md:block relative"
              style={{ height: "360px", minHeight: 220, maxHeight: 460 }}
            >
              {displayImages[0] && (
                <GradientBorderImage
                  src={displayImages[0]}
                  alt="Equipment image 1"
                  style={{ left: "9%", top: "0%", width: "52%", height: "52%" }}
                />
              )}
              {displayImages[1] && (
                <GradientBorderImage
                  src={displayImages[1]}
                  alt="Equipment image 2"
                  style={{
                    right: "10%",
                    top: "6%",
                    width: "36%",
                    height: "52%",
                  }}
                />
              )}
              {displayImages[2] && (
                <GradientBorderImage
                  src={displayImages[2]}
                  alt="Equipment image 3"
                  style={{
                    left: "0%",
                    bottom: "20%",
                    width: "37%",
                    height: "44%",
                    zIndex: 10,
                  }}
                />
              )}
              {displayImages[3] && (
                <GradientBorderImage
                  src={displayImages[3]}
                  alt="Equipment image 4"
                  style={{
                    right: "20%",
                    bottom: "0%",
                    width: "59%",
                    height: "52%",
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
