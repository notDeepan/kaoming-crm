import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Noto_Sans_TC } from "next/font/google";
import "../globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });
const notoTC = Noto_Sans_TC({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-noto-tc", display: "swap" });

export const metadata: Metadata = { title: "Quotation — KAO MING" };

// Bare layout: no app rail. The printable document stands alone (QO-01), on white.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${plexSans.variable} ${plexMono.variable} ${notoTC.variable} min-h-screen bg-[#5b5e62] print:bg-white`}>
      {children}
    </div>
  );
}
