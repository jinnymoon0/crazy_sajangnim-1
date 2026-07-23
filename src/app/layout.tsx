import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
