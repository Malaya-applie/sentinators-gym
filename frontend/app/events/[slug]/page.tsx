import { EventDetailSection } from "@/components/events/event-detail-section";
import { Footer } from "@/components/footer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
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
          <EventDetailSection eventId={slug} />
          <Footer />
        </div>
      </div>
    </main>
  );
}
