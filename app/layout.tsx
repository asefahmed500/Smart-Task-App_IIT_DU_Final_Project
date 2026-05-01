import type { Metadata } from "next";
import { Oswald, Inter, Merriweather, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["200", "300", "400", "500", "600", "700"],
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serifFont = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const monoFont = IBM_Plex_Mono({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SmartTask - Intelligent Task Management",
  description: "Experience the next generation of task management with AI-powered insights and real-time collaboration.",
};

import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${oswald.variable} ${sansFont.variable} ${serifFont.variable} ${monoFont.variable}`} suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen bg-background text-foreground">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
