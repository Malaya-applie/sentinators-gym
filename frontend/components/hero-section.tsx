import { SiteText, getSiteText } from "../lib/content";
import { HeroSectionClient } from "./hero-section-client";

const HERO_DEFAULTS: SiteText = {
  hero_title: "FITNESS\nGOALS",
  hero_subtitle1: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
  hero_subtitle2: "Lorem Ipsum Dolor Sit Amet, Consectetur Adipiscing Elit.",
  hero_button_text: "Fill Form",
  hero_image:
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/anastase-maragos-ehQimz6-1qM-unsplash%201-GdqLOCVXElCrEmbSonGZfnAdIqozNH.png",
};

export async function HeroSection() {
  const content = await getSiteText("hero");
  const heroText: SiteText = { ...HERO_DEFAULTS, ...content };
  return <HeroSectionClient text={heroText} fallback={HERO_DEFAULTS} />;
}
