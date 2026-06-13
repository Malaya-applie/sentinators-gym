import { getSiteText } from "@/lib/content";
import {
  NewsletterSectionClient,
  NewsletterText,
} from "./newsletter-section-client";

export async function NewsletterSection() {
  const text = await getSiteText("newsletter");

  const newsletterText: NewsletterText = {
    newsletter_title: text.newsletter_title,
    newsletter_subtitle: text.newsletter_subtitle,
  };

  return <NewsletterSectionClient initialText={newsletterText} />;
}
