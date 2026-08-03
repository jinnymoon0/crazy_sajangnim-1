import type { Metadata } from "next";
import { UnifrakturMaguntia } from "next/font/google";

import "./globals.css";

/*
 * The wordmark's blackletter face. Self-hosted by next/font, so it is
 * served from our own origin and does not shift once loaded.
 */
const blackletter = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-blackletter",
});

import LoginMetadataRecorder from "@/components/auth/LoginMetadataRecorder";
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
        <LoginMetadataRecorder />
        <UsernameGate />
        {children}
      </body>
    </html>
  );
}
