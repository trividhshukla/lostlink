import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://lostlink-gcet.vercel.app"),
  title: "LostLink — Campus Lost & Found",
  description:
    "A clean, campus-focused Lost & Found web application. Report lost and found items, discover matches with smart description matching, and verify handovers safely.",
  openGraph: {
    title: "LostLink — Campus Lost & Found",
    description:
      "A purpose-built campus Lost & Found. Connect honest finders and rightful owners through structured reporting, private proof verification, and two-sided confirmed handovers.",
    siteName: "LostLink",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LostLink — Campus Lost & Found",
    description:
      "A purpose-built campus Lost & Found. Connect honest finders and rightful owners through structured reporting, private proof verification, and two-sided confirmed handovers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="flex min-h-full flex-col bg-[#F4F3EF] text-stone-900 font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950 overflow-x-hidden">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
