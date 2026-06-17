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

function sanitizeItem(
  value: unknown,
  fallback?: EquipmentFeatureItem,
): EquipmentFeatureItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const item = value as Record<string, unknown>;
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const description =
    typeof item.description === "string" ? item.description.trim() : "";
  const icon = typeof item.icon === "string" ? item.icon.trim() : "";

  if (!title && !description && !icon && !fallback) return null;

  return {
    title: title || fallback?.title || "",
    description: description || fallback?.description || "",
    icon: icon || fallback?.icon || "",
  };
}

export function normalizeEquipmentFeatureItems(
  items: unknown,
  legacyFeatures: string[] = [],
): EquipmentFeatureItem[] {
  if (Array.isArray(items)) {
    const normalized = items
      .map((item, index) =>
        sanitizeItem(item, DEFAULT_EQUIPMENT_FEATURE_ITEMS[index]),
      )
      .filter((item): item is EquipmentFeatureItem => Boolean(item))
      .filter(
        (item) =>
          item.title.trim() || item.description.trim() || item.icon.trim(),
      );

    if (normalized.length > 0) return normalized;
  }

  const normalizedLegacy = legacyFeatures
    .filter((feature) => typeof feature === "string" && feature.trim())
    .map((feature, index) => {
      const fallback = DEFAULT_EQUIPMENT_FEATURE_ITEMS[index];
      return {
        title: feature.trim(),
        description: fallback?.description || "",
        icon: fallback?.icon || "",
      } satisfies EquipmentFeatureItem;
    });

  if (normalizedLegacy.length > 0) return normalizedLegacy;

  return DEFAULT_EQUIPMENT_FEATURE_ITEMS.map((item) => ({ ...item }));
}

export function parseEquipmentFeatureItems(
  raw: string | null | undefined,
  legacyFeatures: string[] = [],
): EquipmentFeatureItem[] {
  if (raw) {
    try {
      return normalizeEquipmentFeatureItems(JSON.parse(raw), legacyFeatures);
    } catch {
      return normalizeEquipmentFeatureItems(undefined, legacyFeatures);
    }
  }

  return normalizeEquipmentFeatureItems(undefined, legacyFeatures);
}
