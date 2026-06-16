import { getEventHighlights, getSiteText } from "@/lib/content";
import { EventsSectionClient } from "@/components/events/events-section-client";

export async function EventsSection() {
  const [highlights, text] = await Promise.all([
    getEventHighlights(),
    getSiteText("events"),
  ]);

  return <EventsSectionClient highlights={highlights} text={text} />;
}
