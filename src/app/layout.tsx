import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Antigravity — Ad Intelligence Dashboard",
  description:
    "Crawl-to-Excel pipeline for competitive ad intelligence. Forensic analysis of creatine gummy competitor video ads.",
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
