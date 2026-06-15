import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import { getSiteText } from "@/lib/content";

export async function Footer() {
  const t = await getSiteText("footer");

  const menuLinks = [
    {
      label: t.footer_menu_1_label || "Home",
      href: t.footer_menu_1_url || "/",
    },
    {
      label: t.footer_menu_2_label || "About",
      href: t.footer_menu_2_url || "/about",
    },
    {
      label: t.footer_menu_3_label || "Membership",
      href: t.footer_menu_3_url || "/membership",
    },
    {
      label: t.footer_menu_4_label || "Shop",
      href: t.footer_menu_4_url || "/shop",
    },
  ];

  return (
    <footer className="py-12 bg-[#0a0208]/70 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Logo & Description */}
          <div>
            <div className="inline-block mb-4">
              <img src="/gym_logo.png" alt="Gym Logo" className="h-12 w-auto" />
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-4">
              {t.footer_description ||
                "Lorem ipsum dolor sit amet consectetur. Ut a mattis augue primum planum est absque. In lorem suspendisse et blandit est ante laboribus. Vel mauris amet mi sit et amet."}
            </p>
            <div className="flex gap-4">
              <Link
                href={t.footer_facebook_url || "#"}
                className="text-white/60 hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href={t.footer_instagram_url || "#"}
                className="text-white/60 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Menu */}
          <div>
            <h4 className="text-white font-semibold mb-4">Menu</h4>
            <ul className="space-y-2">
              {menuLinks.map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.href}
                    className="text-white/60 text-sm hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>{t.footer_address || "Lorem Ipsum St, 25/99034,"}</li>
              <li>{t.footer_phone || "+990 000 0000"}</li>
              <li>{t.footer_email || "info@fitness.com"}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            {t.footer_copyright || "© 2026 Fitness. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
