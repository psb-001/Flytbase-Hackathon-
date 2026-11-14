import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Account Quest · FlytBase CRM",
  description:
    "Five questions per account, every number citable, powered by MCP + Convex.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
