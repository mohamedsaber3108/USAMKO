'use client'

import { useState, useEffect } from 'react'
import { HunterData } from '@/lib/hunter'
import ConfidenceBadge from './ConfidenceBadge'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface ResultCardProps {
  type: 'found' | 'not-found' | 'error'
  data?: HunterData | null
  error?: string
}

export default function ResultCard({ type, data, error }: ResultCardProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Animate in on mount
    setTimeout(() => setMounted(true), 10)
  }, [])

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && document.hasFocus()) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for when document is not focused
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getPreferredSource = (sources: any[], domain: string) => {
    // Prefer source that matches the company domain
    const matchingSource = sources.find(s => s.domain === domain)
    return matchingSource || sources[0]
  }

  // Border accent color
  const borderColor = type === 'found' ? '#6C47FF' : type === 'error' ? '#EF4444' : '#CBD5E1'

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm transition-all duration-300 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      {/* Found State */}
      {type === 'found' && data && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-lg font-semibold text-slate-900">Email found</span>
            </div>
            <ConfidenceBadge score={data.score} />
          </div>

          {/* Email */}
          <div className="mb-4">
            <div className="font-mono text-2xl font-semibold text-slate-900 mb-2">
              {data.email}
            </div>
            <button
              onClick={() => data.email && copyToClipboard(data.email)}
              className="bg-[#6C47FF] hover:bg-[#5B3AE8] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors duration-150"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 my-4"></div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {data.position && (
              <div className="flex gap-2">
                <span className="text-slate-500 font-medium">Position:</span>
                <span className="text-slate-900">{data.position}</span>
              </div>
            )}

            {data.company && (
              <div className="flex gap-2">
                <span className="text-slate-500 font-medium">Company:</span>
                <span className="text-slate-900">{data.company}</span>
              </div>
            )}

            {data.linkedin_url && (
              <div className="flex gap-2">
                <span className="text-slate-500 font-medium">LinkedIn:</span>
                <a
                  href={data.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6C47FF] hover:underline"
                >
                  {data.linkedin_url.replace('https://www.linkedin.com/in/', '')}
                </a>
              </div>
            )}

            {data.sources && data.sources.length > 0 && (
              <div className="flex gap-2">
                <span className="text-slate-500 font-medium">Source:</span>
                <span className="text-slate-900">
                  {(() => {
                    const source = getPreferredSource(data.sources, data.domain)
                    return (
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6C47FF] hover:underline"
                      >
                        {source.domain} · last seen {formatDate(source.last_seen_on)}
                      </a>
                    )
                  })()}
                </span>
              </div>
            )}

            {data.verification && data.verification.status && (
              <div className="flex gap-2">
                <span className="text-slate-500 font-medium">Verified:</span>
                <span className="text-slate-900 capitalize">{data.verification.status}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Not Found State */}
      {type === 'not-found' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-slate-500" />
            <span className="text-lg font-semibold text-slate-900">No email found</span>
          </div>
          <p className="text-sm text-slate-600">
            Hunter couldn&rsquo;t find a verified email for this person. Try entering the company
            domain (e.g. acme.com) instead of the company name, or check the name spelling.
          </p>
        </>
      )}

      {/* Error State */}
      {type === 'error' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-lg font-semibold text-slate-900">Lookup failed</span>
          </div>
          <p className="text-sm text-slate-600">{error || 'An unknown error occurred.'}</p>
        </>
      )}
    </div>
  )
}
