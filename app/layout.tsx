import { Inter, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import ReduxProvider from "@/lib/redux-provider"
import { Toaster } from "@/components/toaster"
import { cn } from "@/lib/utils"
import { ConnectivityListener } from "@/components/layout/connectivity-listener"

// ElevenLabs-inspired font configuration
// Using Inter with light (300) weight for display headings to approximate Waldenburg
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
})

// Geist Mono for code snippets (replaces Waldenburg Mono/Geist Mono)
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

// Note: Waldenburg and WaldenburgFH are proprietary fonts
// We're using Inter 300 as a fallback for display headings
// To use actual Waldenburg fonts, add them to /public/fonts and import locally
const waldenburg = inter
const waldenburgFH = inter

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        inter.variable,
        geistMono.variable,
        waldenburg.variable,
        waldenburgFH.variable
      )}
    >
      <body>
        <ReduxProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <ConnectivityListener />
            </TooltipProvider>
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
