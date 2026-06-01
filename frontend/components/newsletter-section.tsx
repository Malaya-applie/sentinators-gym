"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SiteText } from "@/lib/content";
import { useTranslations } from "next-intl";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [text, setText] = useState<SiteText>({});
  const t = useTranslations("newsletter");

  useEffect(() => {
    fetch(`${API}/content/text/newsletter`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setText(data))
      .catch(() => {});
  }, []);

  return (
    <section className="pb-10 bg-transparent">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div
          className=""
          style={{
            background: "rgba(3, 0, 4, 0.3)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "1rem",
            borderImage: "linear-gradient(90deg, #48215A 0%, #733EA6 100%) 1",
            boxShadow: "0 0 0 1px #733EA633",
            padding: "1.5rem",
            paddingLeft: "1rem",
            paddingRight: "1rem",
          }}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8 w-full">
            <div className="flex-1 min-w-[180px] text-center md:text-left">
              <h3 className="text-2xl xs:text-3xl sm:text-4xl font-extrabold text-white mb-2">
                {text.newsletter_title || "JOIN OUR NEWSLETTER"}
              </h3>
              <p className="text-white/60 text-base mb-0">
                {text.newsletter_subtitle ||
                  "Keep up to date with everything Reflect"}
              </p>
            </div>
            <form className="flex flex-col w-full gap-3 md:w-auto md:flex-row md:items-center md:gap-4 md:justify-end">
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full md:w-[320px] bg-transparent border border-white/30 rounded-md px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-red-500 transition"
              />
              <Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md w-full md:w-auto">
                {t("subscribe")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
