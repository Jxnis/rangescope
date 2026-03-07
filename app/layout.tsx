import './globals.css'
import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono, Manrope, Space_Grotesk } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: 'RangeScope | Wallet Forensics & Investigation Agent',
  description: 'An investigation memory system that learns patterns across cases and surfaces coordinated risk faster.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrains.variable} ${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
