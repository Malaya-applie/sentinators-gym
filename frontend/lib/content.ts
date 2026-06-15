/**
 * Content API helpers — work in both server components (fetch) and client components.
 * For uploaded images stored via the backend, use getImageUrl() to resolve the full URL.
 */

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const MEDIA_BASE = API.replace(/\/api$/, "");

/** Convert a stored path like "/uploads/xxx.jpg" to a full URL */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/uploads/")) return `${MEDIA_BASE}${path}`;
  return path;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SiteText {
  [key: string]: string;
}

export interface Stat {
  id: number;
  value: string;
  label: string;
  order: number;
}

export interface Trainer {
  id: number;
  name: string;
  role: string;
  description?: string | null;
  image?: string | null;
  order: number;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  rating: number;
  content: string;
  image?: string | null;
  order: number;
}

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content?: string | null;
  image?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  category: string;
  gridCol?: string | null;
  gridRow?: string | null;
  order: number;
  isActive: boolean;
}

export interface GalleryCategory {
  id: number;
  name: string;
  order: number;
  isActive: boolean;
}

export interface GalleryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GalleryImagesResponse {
  images: GalleryImage[];
  pagination: GalleryPagination;
}

export interface Achievement {
  id: number;
  image?: string | null;
  title: string;
  order: number;
}

export interface WhyFeature {
  id: number;
  icon: string;
  title: string;
  description: string;
  order: number;
}

export interface EventHighlight {
  id: number;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  image?: string | null;
  isMain: boolean;
  order: number;
}

export interface TrainingZone {
  id: number;
  image?: string | null;
  alt: string;
  order: number;
}

export interface Equipment {
  id: number;
  images: string[];
  features: string[];
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllContent {
  text: SiteText;
  stats: Stat[];
  trainers: Trainer[];
  testimonials: Testimonial[];
  blog: BlogPost[];
  gallery: GalleryImage[];
  achievements: Achievement[];
  whyFeatures: WhyFeature[];
  eventHighlights: EventHighlight[];
  trainingZones: TrainingZone[];
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getAllContent(): Promise<AllContent | null> {
  return fetchJson<AllContent>(`${API}/content/all`);
}

export async function getSiteText(section?: string): Promise<SiteText> {
  const url = section
    ? `${API}/content/text/${section}`
    : `${API}/content/text`;
  return (await fetchJson<SiteText>(url)) ?? {};
}

export async function getStats(): Promise<Stat[]> {
  return (await fetchJson<Stat[]>(`${API}/content/stats`)) ?? [];
}

export async function getTrainers(): Promise<Trainer[]> {
  return (await fetchJson<Trainer[]>(`${API}/content/trainers`)) ?? [];
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return (await fetchJson<Testimonial[]>(`${API}/content/testimonials`)) ?? [];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  return (await fetchJson<BlogPost[]>(`${API}/content/blog`)) ?? [];
}

export async function getGalleryImages(options?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<GalleryImagesResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.category && options.category !== "All") {
    params.set("category", options.category);
  }

  const query = params.toString();
  const url = query
    ? `${API}/content/gallery?${query}`
    : `${API}/content/gallery`;

  return (
    (await fetchJson<GalleryImagesResponse>(url)) ?? {
      images: [],
      pagination: {
        page: options?.page ?? 1,
        limit: options?.limit ?? 12,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  );
}

export async function getGalleryCategories(): Promise<GalleryCategory[]> {
  return (
    (await fetchJson<GalleryCategory[]>(`${API}/content/gallery-categories`)) ??
    []
  );
}

export async function getAchievements(): Promise<Achievement[]> {
  return (await fetchJson<Achievement[]>(`${API}/content/achievements`)) ?? [];
}

export async function getWhyFeatures(): Promise<WhyFeature[]> {
  return (await fetchJson<WhyFeature[]>(`${API}/content/why-choose-us`)) ?? [];
}

export async function getEventHighlights(): Promise<EventHighlight[]> {
  return (
    (await fetchJson<EventHighlight[]>(`${API}/content/event-highlights`)) ?? []
  );
}

export async function getTrainingZones(): Promise<TrainingZone[]> {
  return (
    (await fetchJson<TrainingZone[]>(`${API}/content/training-zones`)) ?? []
  );
}

export async function getEquipment(): Promise<Equipment> {
  return (
    (await fetchJson<Equipment>(`${API}/content/equipment`)) ?? {
      id: 0,
      images: [],
      features: [],
      order: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
}
