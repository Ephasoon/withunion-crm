import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WithUnion CRM",
    template: "%s — WithUnion CRM",
  },
  description: "Built for African Businesses. Powered by AI. The world-class CRM platform for Ethiopian startups, SMEs, hospitals, schools, restaurants, and more.",
  keywords: ["CRM", "Ethiopia", "Africa", "Business", "Sales", "AI", "Leads", "Clients", "Projects"],
  authors: [{ name: "WithUnion Technologies" }],
  creator: "WithUnion Technologies",
  openGraph: {
    type: "website",
    locale: "en_ET",
    title: "WithUnion CRM",
    description: "Built for African Businesses. Powered by AI.",
    siteName: "WithUnion CRM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
