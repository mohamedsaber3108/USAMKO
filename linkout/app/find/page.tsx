'use client'

import { useState } from 'react'
import Link from 'next/link'
import LookupForm from '@/components/LookupForm'
import ResultCard from '@/components/ResultCard'
import { Clipboard, Search, Copy } from 'lucide-react'

export default function FindPage() {
  const [result, setResult] = useState<any>(null)

  const handleResult = (data: any) => {
    if (data.found) {
      setResult({ type: 'found', data: data.data })
    } else {
      setResult({ type: 'not-found', data: data.data })
    }
  }

  const handleError = (error: string) => {
    setResult({ type: 'error', error })
  }

  const handleLoading = (loading: boolean) => {
    if (loading) {
      setResult(null)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <div className="w-2 h-2 rounded-full bg-[#6C47FF]"></div>
            linkout
          </Link>
          <a
            href="https://hunter.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Powered by Hunter.io
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Pill */}
        <div className="text-center mb-4">
          <span className="inline-block text-purple-700 bg-purple-50 rounded-full px-3 py-1 text-xs font-medium">
            LinkedIn Email Finder
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-bold text-slate-900 leading-tight text-center">
          Find anyone&rsquo;s work email.
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-500 mt-2 mb-8 text-center">
          Paste a LinkedIn profile — get a verified email in seconds.
        </p>

        {/* Form */}
        <LookupForm
          onResult={handleResult}
          onError={handleError}
          onLoading={handleLoading}
        />

        {/* Result */}
        {result && (
          <div className="mt-6" data-result-card>
            <ResultCard
              type={result.type}
              data={result.data}
              error={result.error}
            />
          </div>
        )}

        {/* How it works */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <Clipboard className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Paste</h3>
            <p className="text-xs text-slate-500">LinkedIn profile URL</p>
          </div>

          <div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Lookup</h3>
            <p className="text-xs text-slate-500">Hunter finds the email</p>
          </div>

          <div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <Copy className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">Copy</h3>
            <p className="text-xs text-slate-500">One click to copy</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-slate-400">
            Powered by{' '}
            <a
              href="https://hunter.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600"
            >
              Hunter.io
            </a>
          </p>
        </footer>
      </main>
    </>
  )
}
