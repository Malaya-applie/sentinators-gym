import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getTrainers, getSiteText, getImageUrl } from "@/lib/content";

export async function OurTrainersSection() {
  const [allTrainers, text] = await Promise.all([
    getTrainers(),
    getSiteText("about"),
  ]);

  // Use trainers with description (about-page trainers) — fallback to first 4
  const withDesc = allTrainers.filter((t) => t.description);
  const trainers =
    withDesc.length >= 4
      ? withDesc.slice(0, 4)
      : allTrainers.slice(0, 4).map((t) => ({
          ...t,
          description:
            t.description ??
            "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
        }));

  const ph = "/trainer-image.png";

  return (
    <section className="bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {text.about_trainers_title || "OUR TRAINERS"}
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-sm">
            {text.about_trainers_subtitle ||
              "At This Part You Can Easily Access All Of Our Servises. Take A Look At Them And Chose Wich Ever You Want."}
          </p>
        </div>

        {trainers.length >= 2 && (
          <>
            {/* Horizontal scroll for mobile, grid for large screens */}
            <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col justify-center order-1">
                <h3 className="text-white text-xl font-semibold mb-3">
                  {trainers[0].name}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {trainers[0].description}
                </p>
              </div>
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden order-2">
                <Image
                  src={getImageUrl(trainers[0].image) || ph}
                  alt={trainers[0].name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              {trainers[1] && (
                <>
                  <div className="flex flex-col justify-center order-4 lg:order-3">
                    <h3 className="text-white text-xl font-semibold mb-3">
                      {trainers[1].name}
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {trainers[1].description}
                    </p>
                  </div>
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden order-3 lg:order-4">
                    <Image
                      src={getImageUrl(trainers[1].image) || ph}
                      alt={trainers[1].name}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                </>
              )}
            </div>

            {trainers.length >= 4 && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden order-1">
                  <Image
                    src={getImageUrl(trainers[2].image) || ph}
                    alt={trainers[2].name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex flex-col justify-center order-2">
                  <h3 className="text-white text-xl font-semibold mb-3">
                    {trainers[2].name}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {trainers[2].description}
                  </p>
                </div>
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden order-3">
                  <Image
                    src={getImageUrl(trainers[3].image) || ph}
                    alt={trainers[3].name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex flex-col justify-center order-4">
                  <h3 className="text-white text-xl font-semibold mb-3">
                    {trainers[3].name}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {trainers[3].description}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Show more button */}
        <div className="flex justify-center mt-12">
          {/* <Button className="btn-gradient hover:bg-[#8f2244] text-white px-10 py-2 rounded-md text-sm font-medium">
            Show more
          </Button> */}
        </div>

        {/* Separation line  */}
        <div
          className="w-full flex justify-center items-center relative"
          style={{ height: "40px" }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "30%",
              height: "40px",
              background:
                "radial-gradient(ellipse at center, #733EA6 0%, transparent 70%)",
              opacity: 0.45,
              filter: "blur(12px)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              border: "0",
              height: "4px",
              width: "50%",
              borderRadius: "2px",
              background:
                "linear-gradient(90deg, #48215A 0%, #5D225E 50%, #48215A 100%)",
              boxShadow: "0 0 24px 0 #733EA6AA",
              position: "relative",
              zIndex: 1,
            }}
          />
        </div>
      </div>
    </section>
  );
}
