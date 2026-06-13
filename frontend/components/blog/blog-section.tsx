import { BlogPost, getBlogPosts, getSiteText } from "@/lib/content";
import { BlogSectionClient } from "@/components/blog/blog-section-client";

const DEFAULT_POSTS: BlogPost[] = [
  {
    id: 1,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/training-zone-1.png",
    isActive: true,
  },
  {
    id: 2,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/training-zone-2.png",
    isActive: true,
  },
  {
    id: 3,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/training-zone-3.png",
    isActive: true,
  },
  {
    id: 4,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/training-zone-4.png",
    isActive: true,
  },
  {
    id: 5,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/equipment-1.png",
    isActive: true,
  },
  {
    id: 6,
    title: "Lorem ipsum",
    excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    image: "/equipment-2.png",
    isActive: true,
  },
];

export async function BlogSection() {
  const [posts, text] = await Promise.all([
    getBlogPosts(),
    getSiteText("blog"),
  ]);
  return (
    <BlogSectionClient
      initialPosts={posts.length > 0 ? posts : DEFAULT_POSTS}
      initialText={text}
    />
  );
}
