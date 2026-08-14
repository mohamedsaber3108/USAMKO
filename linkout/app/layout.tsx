import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Linkout | Find anyone. Instantly.',
  description: 'The smartest way to find anyone&rsquo;s work email directly from their LinkedIn profile. Powered by AI enrichment and pattern detection.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} text-slate-900`}>{children}</body>
    </html>
  )
}
