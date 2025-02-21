import type React from "react"
import "./globals.css"
import { Press_Start_2P } from "next/font/google"

const pixelFont = Press_Start_2P({ subsets: ["latin"], weight: "400" })

export const metadata = {
  title: "Onchain Heroes Metadata Viewer",
  description: "View metadata for Onchain Heroes NFTs",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={pixelFont.className}>{children}</body>
    </html>
  )
}



import './globals.css'