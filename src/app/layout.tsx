import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { Inter, Outfit } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Hallunot",
  description:
    "Check which library versions an LLM is likely to know well, based on training data cutoff dates.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}
