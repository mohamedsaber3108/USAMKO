import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Find Email | Linkout',
  description: 'Find verified work emails from LinkedIn profiles instantly.',
}

export default function FindLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
