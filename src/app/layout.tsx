import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

/*
 * The wordmark's blackletter face. Self-hosted by next/font, so it is
 * served from our own origin and does not shift once loaded.
 *
 * Textura Libera, bundled with the app rather than fetched from a font
 * service. Textura is the tradition the brand image is set in — and
 * unlike the fraktur faces on Google Fonts, its capital S is drawn open,
 * so the name reads Sajangnim rather than Gajangnim.
 *
 * Cut down to the Latin range and packed as woff2: the wordmark needs a
 * few dozen letters, not the medieval sigla and Lombardic initials the
 * full face carries, which are 91% of its weight.
 */
const blackletter = localFont({
  src: "./fonts/TexturaLibera-latin.woff2",
  display: "swap",
  variable: "--font-blackletter",
});

import LoginMetadataRecorder from "@/components/auth/LoginMetadataRecorder";
import VisitRecorder from "@/components/VisitRecorder";
import UsernameGate from "@/components/auth/UsernameGate";

export const metadata: Metadata = {
  title: "Crazy Sajangnim",
  description:
    "A designer fashion sale aggregator for Korean and American retailers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={blackletter.variable}>
      <body>
        <VisitRecorder />
        <LoginMetadataRecorder />
        <UsernameGate />
        {children}
      </body>
    </html>
  );
}
