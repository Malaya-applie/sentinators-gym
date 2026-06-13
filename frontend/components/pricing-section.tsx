import { getSiteText } from "../lib/content";
import {
  PricingSectionClient,
  type PricingText,
} from "./pricing-section-client";

const PRICING_TEXT_DEFAULTS: PricingText = {
  pricing_section_title: "OUR PLANS & PRICING",
  pricing_section_subtitle: "Choose a membership that fits your goals",
};

export async function PricingSection() {
  const text = await getSiteText("pricing");
  const initialPricingText: PricingText = {
    pricing_section_title:
      text.pricing_section_title || PRICING_TEXT_DEFAULTS.pricing_section_title,
    pricing_section_subtitle:
      text.pricing_section_subtitle ||
      PRICING_TEXT_DEFAULTS.pricing_section_subtitle,
  };

  return <PricingSectionClient initialPricingText={initialPricingText} />;
}
