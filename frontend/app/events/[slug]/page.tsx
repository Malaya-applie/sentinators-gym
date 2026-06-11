import { EventDetailHero } from "@/components/events/event-detail-hero";
import { EventDetailContent } from "@/components/events/event-detail-content";
import { NewsletterSection } from "@/components/newsletter-section";
import { Footer } from "@/components/footer";

export default function EventDetailPage() {
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
          <EventDetailHero />
          <EventDetailContent />
          {/* <NewsletterSection /> */}
          <Footer />
        </div>
      </div>
    </main>
  );
}
