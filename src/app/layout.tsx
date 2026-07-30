import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        <LoginMetadataRecorder />
        <UsernameGate />
        {children}
      </body>
    </html>
  );
}
