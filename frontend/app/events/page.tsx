import { EventsHero } from "@/components/events/events-hero";
import { EventScheduleSection } from "@/components/events/event-schedule-section";
import { EventsSection } from "@/components/events-section";
import { CTASection } from "@/components/cta-section";
import { NewsletterSection } from "@/components/newsletter-section";
import { Footer } from "@/components/footer";

export default function EventsPage() {
  return (
    <main className="min-h-screen relative">
      {/* Fixed Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url('/gym-bg-texture.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="pt-16">
          <EventsHero />
          <EventScheduleSection />
          <CTASection />
          {/* <NewsletterSection /> */}
          <Footer />
        </div>
      </div>
    </main>
  );
}
