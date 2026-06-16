import Image from "next/image";
import { getTrainers, getSiteText, getImageUrl } from "@/lib/content";

export async function OurTrainersSection() {
  const [allTrainers, text] = await Promise.all([
    getTrainers(),
    getSiteText("about"),
  ]);

  const trainers = allTrainers.map((t) => ({
    ...t,
    description:
      t.description ??
      "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
  }));

  const ph = "/trainer-image.png";
  const trainerGroups = Array.from(
    { length: Math.ceil(trainers.length / 4) },
    (_, i) => trainers.slice(i * 4, i * 4 + 4),
  );

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

        {/* Mobile horizontal cards */}
        <div className="sm:hidden -mx-4 px-4 overflow-x-auto hide-scrollbar pb-2">
          <div className="flex gap-4 snap-x snap-mandatory">
            {trainers.map((trainer, index) => (
              <article
                key={`mobile-trainer-${trainer.id}-${index}`}
                className="min-w-[78vw] max-w-[78vw] shrink-0 snap-start"
              >
                <div className="relative aspect-4/5 rounded-2xl overflow-hidden">
                  <Image
                    src={getImageUrl(trainer.image) || ph}
                    alt={trainer.name}
                    fill
                    className="object-cover object-top"
                  />
                </div>
                <div className="pt-4">
                  <h3 className="text-white text-xl font-semibold mb-2">
                    {trainer.name}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {trainer.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="hidden sm:block">
          {trainerGroups.map((group, groupIndex) => {
            const t0 = group[0];
            const t1 = group[1];
            const t2 = group[2];
            const t3 = group[3];

            return (
              <div
                key={`trainer-group-${groupIndex}`}
                className={groupIndex > 0 ? "mt-6" : ""}
              >
                {(t0 || t1) && (
                  <div className="grid grid-cols-1 gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
                    {t0 && (
                      <>
                        <div className="flex flex-col justify-center order-1">
                          <h3 className="text-white text-xl font-semibold mb-3">
                            {t0.name}
                          </h3>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {t0.description}
                          </p>
                        </div>
                        <div className="relative aspect-4/5 rounded-2xl overflow-hidden order-2">
                          <Image
                            src={getImageUrl(t0.image) || ph}
                            alt={t0.name}
                            fill
                            className="object-cover object-top"
                          />
                        </div>
                      </>
                    )}

                    {t1 && (
                      <>
                        <div className="flex flex-col justify-center order-4 lg:order-3">
                          <h3 className="text-white text-xl font-semibold mb-3">
                            {t1.name}
                          </h3>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {t1.description}
                          </p>
                        </div>
                        <div className="relative aspect-4/5 rounded-2xl overflow-hidden order-3 lg:order-4">
                          <Image
                            src={getImageUrl(t1.image) || ph}
                            alt={t1.name}
                            fill
                            className="object-cover object-top"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {(t2 || t3) && (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {t2 && (
                      <>
                        <div className="relative aspect-4/5 rounded-2xl overflow-hidden order-1">
                          <Image
                            src={getImageUrl(t2.image) || ph}
                            alt={t2.name}
                            fill
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="flex flex-col justify-center order-2">
                          <h3 className="text-white text-xl font-semibold mb-3">
                            {t2.name}
                          </h3>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {t2.description}
                          </p>
                        </div>
                      </>
                    )}

                    {t3 && (
                      <>
                        <div className="relative aspect-4/5 rounded-2xl overflow-hidden order-3">
                          <Image
                            src={getImageUrl(t3.image) || ph}
                            alt={t3.name}
                            fill
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="flex flex-col justify-center order-4">
                          <h3 className="text-white text-xl font-semibold mb-3">
                            {t3.name}
                          </h3>
                          <p className="text-white/60 text-sm leading-relaxed">
                            {t3.description}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
