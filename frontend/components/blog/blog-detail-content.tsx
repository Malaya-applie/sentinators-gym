"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogPost } from "@/lib/content";

interface BlogDetailContentProps {
  post: BlogPost;
}

export function BlogDetailContent({ post }: BlogDetailContentProps) {
  const excerptHtml = post.excerpt || "";
  const contentHtml = post.content || post.excerpt || "";

  return (
    <section className="py-16 bg-transparent">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 flex flex-col gap-6">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Back to Blog
        </Link>

        {/* Excerpt */}
        <div
          className="rounded-xl border border-white/10 p-8"
          style={{ background: "#0300044D" }}
        >
          <div
            className="text-white/80 text-base sm:text-lg leading-relaxed font-medium italic [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-red-300 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: excerptHtml }}
          />
        </div>

        {/* Full Content */}
        <div
          className="rounded-xl border border-white/10 p-8"
          style={{ background: "#0300044D" }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6 tracking-wide">
            FULL ARTICLE
          </h2>
          {/* Divider glow */}
          <div
            className="w-full h-px mb-6"
            style={{
              background:
                "linear-gradient(90deg, transparent, #7C3AED88, transparent)",
            }}
          />
          <div
            className="text-white/70 text-sm sm:text-base leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-red-500/60 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-red-300 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </div>
      </div>
    </section>
  );
}
