"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { BlogPost, SiteText, getImageUrl } from "@/lib/content";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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

export function BlogSection() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    searchParams.get("q") ?? "",
  );
  const [posts, setPosts] = useState<BlogPost[]>(DEFAULT_POSTS);
  const [text, setText] = useState<SiteText>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadContent = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const [postsRes, textRes] = await Promise.all([
          fetch(`${API}/content/blog`, { signal: controller.signal }),
          fetch(`${API}/content/text/blog`, { signal: controller.signal }),
        ]);

        if (!postsRes.ok) {
          throw new Error("Failed to load blog posts");
        }

        const [postsData, textData] = await Promise.all([
          postsRes.json(),
          textRes.ok ? textRes.json() : Promise.resolve(null),
        ]);

        if (Array.isArray(postsData) && postsData.length) {
          setPosts(postsData);
        }

        if (textData) {
          setText(textData);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadContent();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const currentQueryParam = searchParams.get("q") ?? "";
    if (currentQueryParam === debouncedQuery) return;

    const currentParams = new URLSearchParams(searchParams.toString());

    if (debouncedQuery) {
      currentParams.set("q", debouncedQuery);
    } else {
      currentParams.delete("q");
    }

    router.replace(
      currentParams.toString()
        ? `${pathname}?${currentParams.toString()}`
        : pathname,
      { scroll: false },
    );
  }, [debouncedQuery, pathname, router, searchParams]);

  const filtered = useMemo(() => {
    if (!debouncedQuery) return posts;

    const term = debouncedQuery.toLowerCase();

    return posts.filter((post) => {
      const title = post.title?.toLowerCase() ?? "";
      const excerpt = post.excerpt?.toLowerCase() ?? "";

      return title.includes(term) || excerpt.includes(term);
    });
  }, [debouncedQuery, posts]);

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wide mb-4">
            {text.blog_section_title || "BLOG"}
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            {text.blog_section_subtitle ||
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
          </p>
        </div>

        {/* Search */}
        <div className="flex justify-center mb-12">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search blog posts"
              placeholder="Search"
              className="w-full rounded-full bg-white text-black placeholder-gray-400 px-5 py-3 pr-12 text-sm outline-none"
            />
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((post) => (
            <div key={post.id} className="flex flex-col">
              {/* Image */}
              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-4">
                <Image
                  src={getImageUrl(post.image) || "/training-zone-1.png"}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <h3 className="text-white font-semibold text-lg mb-2">
                {post.title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-3 flex-1">
                {post.excerpt}
              </p>
              <Link
                href={`/blog/${post.id}`}
                className="text-white/60 text-sm hover:text-white transition-colors self-end"
              >
                read more..
              </Link>
            </div>
          ))}
        </div>

        {!isLoading && hasError ? (
          <p className="text-center text-red-200 text-sm mt-8">
            Unable to refresh blog posts. Showing available content.
          </p>
        ) : null}

        {!isLoading && !filtered.length ? (
          <p className="text-center text-white/70 text-sm mt-8">
            No blog posts matched "{debouncedQuery}".
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-center text-white/70 text-sm mt-8">
            Loading blog posts...
          </p>
        ) : null}
      </div>
    </section>
  );
}
