import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ConditionalNavbar } from "@/components/conditional-navbar";
import { ReduxProvider } from "@/components/redux-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sentinators - Transform Your Body, Transform Your Life",
  description:
    "Join Sentinators premium fitness center with expert trainers, modern equipment, and personalized workout plans to achieve your fitness goals.",
  generator: "v0.app",
  icons: {
    icon: "/gym_logo.png",
    apple: "/gym_logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ReduxProvider>
            <ConditionalNavbar />
            {children}
            {process.env.NODE_ENV === "production" && <Analytics />}
          </ReduxProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
