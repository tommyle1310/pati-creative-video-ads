import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Enhanced AI Factory",
  description:
    "Competitive ad intelligence platform. Discover winning ads, save and compare them, generate actionable creative briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <Sidebar />
        <div className="ml-[200px]">{children}</div>
      </body>
    </html>
  );
}
