import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Snizzz Cebu Travel & Tours | Book Your Island Escape",
  description:
    "Book Cebu and Bohol tours online. Whale sharks, Chocolate Hills, Kawasan Falls, and more — travel in style with Snizzz.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Snizzz Book",
  },
  icons: {
    icon: "/brand/snizzz-logo-v2.png",
    apple: "/brand/snizzz-logo-v2.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3d4a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
