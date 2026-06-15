"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { BlogPost, SiteText, getImageUrl } from "@/lib/content";

function htmlToPlainText(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function BlogSectionClient({
  initialPosts,
  initialText,
}: {
  initialPosts: BlogPost[];
  initialText: SiteText;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(
    searchParams.get("q") ?? "",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const POSTS_PER_PAGE = 6;

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
    if (!debouncedQuery) return initialPosts;

    const term = debouncedQuery.toLowerCase();

    return initialPosts.filter((post) => {
      const title = post.title?.toLowerCase() ?? "";
      const excerpt = htmlToPlainText(post.excerpt).toLowerCase();

      return title.includes(term) || excerpt.includes(term);
    });
  }, [debouncedQuery, initialPosts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE;
    return filtered.slice(start, start + POSTS_PER_PAGE);
  }, [currentPage, filtered]);

  function changePage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={listTopRef} />
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wide mb-4">
            {initialText.blog_section_title || "BLOG"}
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            {initialText.blog_section_subtitle ||
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
          </p>
        </div>

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedPosts.map((post) => (
            <div key={post.id} className="flex flex-col">
              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden mb-4">
                <Image
                  src={getImageUrl(post.image) || "/training-zone-1.png"}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>

              <h3 className="text-white font-semibold text-lg mb-2">
                {post.title}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-3 flex-1">
                {htmlToPlainText(post.excerpt)}
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

        {filtered.length > 0 && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => changePage(page)}
                  className={`h-10 min-w-10 rounded-md border px-3 text-sm font-semibold transition ${
                    currentPage === page
                      ? "border-red-500 bg-red-700 text-white"
                      : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {!filtered.length ? (
          <p className="text-center text-white/70 text-sm mt-8">
            No blog posts matched "{debouncedQuery}".
          </p>
        ) : null}
      </div>
    </section>
  );
}
