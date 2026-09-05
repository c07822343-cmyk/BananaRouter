import type { Metadata } from "next";
import { getAppName, getAppDescription } from "@/lib/server/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "BananaRouter — AI Workspace",
  description: getAppDescription(),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/branding/banana-router-icon.svg", type: "image/svg+xml" },
      { url: "/branding/banana-router-icon.png", type: "image/png" },
      { url: "/icon-192.png", type: "image/png" },
    ],
    apple: [{ url: "/branding/banana-router-icon.png" }],
  },
  openGraph: {
    title: "BananaRouter — AI Workspace",
    description: getAppDescription(),
    siteName: "BananaRouter",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
