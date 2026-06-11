"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BlogDetailHero } from "@/components/blog/blog-detail-hero";
import { BlogDetailContent } from "@/components/blog/blog-detail-content";
import { NewsletterSection } from "@/components/newsletter-section";
import { BlogPost, getImageUrl } from "@/lib/content";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function BlogDetailPageClient() {
  const params = useParams();
  const id = params?.id as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/content/blog/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <div className="relative z-10 pt-16">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/50 text-lg tracking-widest">Loading...</p>
        </div>
      ) : !post ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-white/50 text-lg tracking-widest">
            Post not found.
          </p>
        </div>
      ) : (
        <>
          <BlogDetailHero post={post} />
          <BlogDetailContent post={post} />
          {/* <NewsletterSection /> */}
        </>
      )}
    </div>
  );
}
