import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collections Summary Reviewer",
  description: "Browse collections calls with their transcripts and summaries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
