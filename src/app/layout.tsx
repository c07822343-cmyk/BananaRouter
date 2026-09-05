import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenRouter Chat",
  description:
    "A modern AI chat dashboard powered by OpenRouter. AI inference is provided through the OpenRouter API.",
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
