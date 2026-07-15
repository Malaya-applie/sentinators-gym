import { getPublicEvents, getSiteText } from "@/lib/content";
import { EventsSectionClient } from "@/components/events/events-section-client";

export async function EventsSection() {
  const [events, text] = await Promise.all([
    getPublicEvents(),
    getSiteText("events"),
  ]);

  const highlights = events
    .slice()
    .sort(
      (a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""),
    )
    .slice(0, 4)
    .map((event, index) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      videoUrl: null,
      image: event.image,
      isMain: false,
      order: index,
      createdAt: event.createdAt,
    }));

  return <EventsSectionClient highlights={highlights} text={text} />;
}
