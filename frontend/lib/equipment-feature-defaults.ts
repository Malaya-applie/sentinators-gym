export type EquipmentFeatureItem = {
  title: string;
  description: string;
  icon: string;
};

export const DEFAULT_EQUIPMENT_FEATURE_ITEMS: EquipmentFeatureItem[] = [
  {
    title: "Proteinbar im Gym",
    description: "Shakes, Drinks und schnelle Snacks direkt vor Ort.",
    icon: "/equipment-icons/protein-bar.png",
  },
  {
    title: "Member Vorteile",
    description: "Exklusive Extras und Benefits fur unsere Community.",
    icon: "/equipment-icons/member-benefits.png",
  },
  {
    title: "Food fur den Alltag",
    description: "Praktische Optionen fur unterwegs und jeden Tag.",
    icon: "/equipment-icons/food-everyday.png",
  },
  {
    title: "Whey & Supplements",
    description: "Von Whey bis Aminos - alles direkt im Gym.",
    icon: "/equipment-icons/whey-supplements.png",
  },
  {
    title: "Mehr als Training",
    description: "Trainieren, einkaufen und auftanken an einem Ort.",
    icon: "/equipment-icons/more-than-training.png",
  },
];

export function normalizeEquipmentFeatureItems(
  items: unknown,
  legacyFeatures: string[] = [],
): EquipmentFeatureItem[] {
  if (Array.isArray(items)) {
    const normalized = items
      .map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }

        const value = item as Record<string, unknown>;
        const fallback = DEFAULT_EQUIPMENT_FEATURE_ITEMS[index];
        const title = typeof value.title === "string" ? value.title.trim() : "";
        const description =
          typeof value.description === "string" ? value.description.trim() : "";
        const icon = typeof value.icon === "string" ? value.icon.trim() : "";

        if (!title && !description && !icon && !fallback) return null;

        return {
          title: title || fallback?.title || "",
          description: description || fallback?.description || "",
          icon: icon || fallback?.icon || "",
        } satisfies EquipmentFeatureItem;
      })
      .filter((item): item is EquipmentFeatureItem => Boolean(item))
      .filter(
        (item) =>
          item.title.trim() || item.description.trim() || item.icon.trim(),
      );

    if (normalized.length > 0) return normalized;
  }

  const normalizedLegacy = legacyFeatures
    .filter((feature) => typeof feature === "string" && feature.trim())
    .map((feature, index) => ({
      title: feature.trim(),
      description: DEFAULT_EQUIPMENT_FEATURE_ITEMS[index]?.description || "",
      icon: DEFAULT_EQUIPMENT_FEATURE_ITEMS[index]?.icon || "",
    }));

  if (normalizedLegacy.length > 0) return normalizedLegacy;

  return DEFAULT_EQUIPMENT_FEATURE_ITEMS.map((item) => ({ ...item }));
}
