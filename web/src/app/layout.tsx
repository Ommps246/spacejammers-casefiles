import type { Metadata } from "next";
import "./globals.css";

// System font stack only (see globals.css): no font download, so the build and the demo work offline.
export const metadata: Metadata = {
  title: "Case Files · SpaceJammers",
  description: "Every trend on Earth has a story. We find it, prove it, and argue against it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
