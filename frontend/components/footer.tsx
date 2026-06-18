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
    // <footer className="py-12 bg-[#0a0208]/70 border-t border-white/10">
    //   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    //     <div className="grid md:grid-cols-4 gap-12">
    //       {/* Logo & Description */}
    //       <div>
    //         <div className="inline-block mb-4">
    //           <img src="/gym_logo.png" alt="Gym Logo" className="h-12 w-auto" />
    //         </div>
    //         <p className="text-white/60 text-sm leading-relaxed mb-4">
    //           {t.footer_description ||
    //             "Lorem ipsum dolor sit amet consectetur. Ut a mattis augue primum planum est absque. In lorem suspendisse et blandit est ante laboribus. Vel mauris amet mi sit et amet."}
    //         </p>
    //         <div className="flex gap-4">
    //           <Link
    //             href={t.footer_facebook_url || "#"}
    //             className="text-white/60 hover:text-white transition-colors"
    //           >
    //             <Facebook className="w-5 h-5" />
    //           </Link>
    //           <Link
    //             href={t.footer_instagram_url || "#"}
    //             className="text-white/60 hover:text-white transition-colors"
    //           >
    //             <Instagram className="w-5 h-5" />
    //           </Link>
    //         </div>
    //       </div>

    //       {/* Menu */}
    //       <div>
    //         <h4 className="text-white font-semibold mb-4">Menu</h4>
    //         <ul className="space-y-2">
    //           {menuLinks.map((link, index) => (
    //             <li key={index}>
    //               <Link
    //                 href={link.href}
    //                 className="text-white/60 text-sm hover:text-white transition-colors"
    //               >
    //                 {link.label}
    //               </Link>
    //             </li>
    //           ))}
    //         </ul>
    //       </div>

    //       {/* Timings */}
    //       <div>
    //         <h4 className="text-white font-semibold mb-4">
    //           {t.footer_timing_heading || "Öffnungszeiten"}
    //         </h4>
    //         <ul className="space-y-3 text-white/60 text-sm">
    //           <li className="flex justify-between gap-4">
    //             <span>Mo – Do</span>
    //             <span className="text-white/80 text-right">
    //               {t.footer_timing_mon_thu || "09:00–12:00 & 17:00–21:00"}
    //             </span>
    //           </li>
    //           <li className="flex justify-between gap-4">
    //             <span>Freitag</span>
    //             <span className="text-white/80 text-right">
    //               {t.footer_timing_fri || "09:00–12:00 & 17:00–20:00"}
    //             </span>
    //           </li>
    //           <li className="flex justify-between gap-4">
    //             <span>Samstag</span>
    //             <span className="text-white/80 text-right">
    //               {t.footer_timing_sat || "09:00–14:00"}
    //             </span>
    //           </li>
    //           <li className="pt-2 border-t border-white/10">
    //             <p className="text-white/40 text-xs">
    //               {t.footer_timing_key_card ||
    //                 "Mit Schlüsselkarte: 05:00–24:00"}
    //             </p>
    //           </li>
    //         </ul>
    //       </div>

    //       {/* Contact */}
    //       <div>
    //         <h4 className="text-white font-semibold mb-4">Contact</h4>
    //         <ul className="space-y-2 text-white/60 text-sm">
    //           <li>{t.footer_address || "Lorem Ipsum St, 25/99034,"}</li>
    //           <li>{t.footer_phone || "+990 000 0000"}</li>
    //           <li>{t.footer_email || "info@fitness.com"}</li>
    //         </ul>
    //       </div>
    //     </div>

    //     <div className="mt-12 pt-8 border-t border-white/10 text-center">
    //       <p className="text-white/40 text-sm">
    //         {t.footer_copyright || "© 2026 Fitness. All rights reserved."}
    //       </p>
    //     </div>
    //   </div>
    // </footer>
    <footer className="py-12 bg-[#0a0208]/70 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[320px_180px_380px_260px] justify-between gap-x-10 gap-y-10">
          {/* Logo & Description */}
          <div className="flex flex-col">
            <div className="inline-block mb-4">
              <img src="/gym_logo.png" alt="Gym Logo" className="h-12 w-auto" />
            </div>

            <p className="text-white/60 text-sm leading-relaxed mb-6">
              {t.footer_description ||
                "Lorem ipsum dolor sit amet consectetur. Ut a mattis augue primum planum est absque. In lorem suspendisse et blandit est ante laboribus. Vel mauris amet mi sit et amet."}
            </p>

            <div className="flex gap-4 mt-auto">
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
          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xl mb-8">Menu</h4>

            <ul className="space-y-4">
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

          {/* Opening Hours */}
          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xl mb-8">
              {t.footer_timing_heading || "Öffnungszeiten"}
            </h4>

            <ul className="space-y-5 text-sm">
              <li className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-white/60">Mo – Do</span>
                <span className="text-white/80">
                  {t.footer_timing_mon_thu || "09:00–12:00 & 17:00–21:00"}
                </span>
              </li>

              <li className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-white/60">Freitag</span>
                <span className="text-white/80">
                  {t.footer_timing_fri || "09:00–12:00 & 17:00–20:00"}
                </span>
              </li>

              <li className="grid grid-cols-[100px_1fr] gap-4">
                <span className="text-white/60">Samstag</span>
                <span className="text-white/80">
                  {t.footer_timing_sat || "09:00–14:00"}
                </span>
              </li>

              <li className="pt-0">
                <p className="text-white/50 text-sm">
                  {t.footer_timing_key_card ||
                    "Mit Schlüsselkarte: 05:00–24:00"}
                </p>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col">
            <h4 className="text-white font-semibold text-xl mb-8">Contact</h4>

            <ul className="space-y-5 text-white/60 text-sm">
              <li>{t.footer_address || "Lorem Ipsum St, 25/99034"}</li>

              <li>{t.footer_phone || "+990 000 0000"}</li>

              <li>{t.footer_email || "info@fitness.com"}</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-center text-white/40 text-sm">
            {t.footer_copyright || "© 2026 Fitness. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
