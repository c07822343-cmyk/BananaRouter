import type { Metadata } from "next";
import { getAppName, getAppDescription } from "@/lib/server/config";
import "./globals.css";

export const metadata: Metadata = {
  title: getAppName(),
  description: getAppDescription(),
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
