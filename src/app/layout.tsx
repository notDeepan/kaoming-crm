import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Noto_Sans_TC } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocale } from "@/i18n/locale";
import "./globals.css";

// Fonts are downloaded at build time and self-hosted — no runtime network call (GP6).
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
const notoTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-tc",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAO MING — Sales & Channel",
  description: "Internal sales and channel management for KAO MING Machinery.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${plexSans.variable} ${plexMono.variable} ${notoTC.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
