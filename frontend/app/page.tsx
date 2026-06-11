import { HeroSection } from "@/components/hero-section";
import { StatsSection } from "@/components/stats-section";
import { WhyChooseUs } from "@/components/why-choose-us";
import { PricingSection } from "@/components/pricing-section";
import { TrainersSection } from "@/components/trainers-section";
import { TestimonialsSection } from "@/components/testimonials-section";
import { EventsSection } from "@/components/events-section";
import { CTASection } from "@/components/cta-section";
import { NewsletterSection } from "@/components/newsletter-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen text-white relative">
      {/* Full page background - continuous purple texture */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/gym-bg-texture.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Content wrapper */}
      <div className="relative z-10 pt-16">
        <HeroSection />
        <StatsSection />
        <WhyChooseUs />
        <PricingSection />
        <TrainersSection />
        <TestimonialsSection />
        <EventsSection />
        <CTASection />
        {/* <NewsletterSection /> */}
        <Footer />
      </div>
    </main>
  );
}
