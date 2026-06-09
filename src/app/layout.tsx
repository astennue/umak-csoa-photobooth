import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UMak CSOA Photobooth Management System",
  description: "Photobooth management system for the Center for Student Organization and Activities at the University of Makati",
  keywords: ["UMak", "CSOA", "Photobooth", "Management", "Events", "University of Makati"],
  authors: [{ name: "UMak CSOA" }],
  icons: {
    icon: "/umak-csoa-logo.png",
  },
  openGraph: {
    title: "UMak CSOA Photobooth Management System",
    description: "Photobooth management system for the Center for Student Organization and Activities at the University of Makati",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UMak CSOA Photobooth Management System",
    description: "Photobooth management system for the Center for Student Organization and Activities at the University of Makati",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
