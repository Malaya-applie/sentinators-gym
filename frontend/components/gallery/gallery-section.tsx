import {
  GalleryImage as GalleryImageType,
  getGalleryCategories,
  getGalleryImages,
  getSiteText,
} from "@/lib/content";
import { GallerySectionClient } from "@/components/gallery/gallery-section-client";

const PAGE_SIZE = 12;

const DEFAULT_CATEGORIES = [
  "All",
  "Events",
  "Workouts",
  "Training Sessions",
  "Transformations",
];

const DEFAULT_IMAGES: GalleryImageType[] = [
  {
    id: 1,
    src: "/gallery-1.jpg",
    category: "Training Sessions",
    alt: "Group training session",
    gridCol: "1/3",
    gridRow: "1/2",
    order: 0,
    isActive: true,
  },
  {
    id: 2,
    src: "/gallery-2.jpg",
    category: "Workouts",
    alt: "Workout",
    gridCol: "3/4",
    gridRow: "1/4",
    order: 1,
    isActive: true,
  },
  {
    id: 3,
    src: "/gallery-3.jpg",
    category: "Events",
    alt: "Boxing event",
    gridCol: "4/5",
    gridRow: "1/2",
    order: 2,
    isActive: true,
  },
  {
    id: 4,
    src: "/gallery-4.jpg",
    category: "Training Sessions",
    alt: "Stretching session",
    gridCol: "5/6",
    gridRow: "1/2",
    order: 3,
    isActive: true,
  },
  {
    id: 5,
    src: "/gallery-5.jpg",
    category: "Training Sessions",
    alt: "Personal training",
    gridCol: "1/2",
    gridRow: "2/3",
    order: 4,
    isActive: true,
  },
  {
    id: 6,
    src: "/gallery-6.jpg",
    category: "Events",
    alt: "Nutrition workshop",
    gridCol: "2/3",
    gridRow: "2/3",
    order: 5,
    isActive: true,
  },
  {
    id: 7,
    src: "/gallery-7.jpg",
    category: "Workouts",
    alt: "Battle ropes workout",
    gridCol: "1/3",
    gridRow: "3/4",
    order: 6,
    isActive: true,
  },
  {
    id: 8,
    src: "/gallery-8.jpg",
    category: "Workouts",
    alt: "Weight training",
    gridCol: "4/5",
    gridRow: "2/3",
    order: 7,
    isActive: true,
  },
  {
    id: 9,
    src: "/gallery-9.jpg",
    category: "Transformations",
    alt: "Transformation",
    gridCol: "5/6",
    gridRow: "2/3",
    order: 8,
    isActive: true,
  },
  {
    id: 10,
    src: "/gallery-10.jpg",
    category: "Transformations",
    alt: "Pull-up transformation",
    gridCol: "4/5",
    gridRow: "3/4",
    order: 9,
    isActive: true,
  },
  {
    id: 11,
    src: "/gallery-11.jpg",
    category: "Workouts",
    alt: "Gym workout",
    gridCol: "5/6",
    gridRow: "3/4",
    order: 10,
    isActive: true,
  },
];

export async function GallerySection() {
  const [galleryResponse, text, galleryCategories] = await Promise.all([
    getGalleryImages({ page: 1, limit: PAGE_SIZE }),
    getSiteText("gallery"),
    getGalleryCategories(),
  ]);

  const fallbackImages = DEFAULT_IMAGES.slice(0, PAGE_SIZE);
  const initialImages =
    galleryResponse.images.length > 0 ? galleryResponse.images : fallbackImages;
  const initialCategories =
    galleryCategories.length > 0
      ? [
          "All",
          ...galleryCategories
            .map((category) => category.name.trim())
            .filter((name) => name && name.toLowerCase() !== "all"),
        ]
      : DEFAULT_CATEGORIES;

  return (
    <GallerySectionClient
      initialImages={initialImages}
      initialText={text}
      initialCategories={initialCategories}
      initialPagination={galleryResponse.pagination}
    />
  );
}
