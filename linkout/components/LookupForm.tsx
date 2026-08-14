'use client'

import { useState, useEffect } from 'react'
import { parseLinkedInUrl } from '@/lib/linkedin'
import { Loader2, ArrowRight } from 'lucide-react'

interface LookupFormProps {
  onResult: (result: any) => void
  onError: (error: string) => void
  onLoading: (loading: boolean) => void
}

export default function LookupForm({ onResult, onError, onLoading }: LookupFormProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [company, setCompany] = useState('')
  const [nameSource, setNameSource] = useState<'url' | 'manual' | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{
    url?: string
    name?: string
    domainOrCompany?: string
  }>({})

  // Auto-fill name from URL
  useEffect(() => {
    if (!url) return

    const parsed = parseLinkedInUrl(url)
    if (parsed.name && nameSource !== 'manual') {
      setName(parsed.name)
      setNameSource('url')
    }
  }, [url, nameSource])

  const handleNameChange = (value: string) => {
    setName(value)
    if (value.trim()) {
      setNameSource('manual')
    }
  }

  const validate = () => {
    const newErrors: typeof errors = {}

    // URL validation
    if (!url.trim()) {
      newErrors.url = 'LinkedIn profile URL is required'
    } else {
      const parsed = parseLinkedInUrl(url)
      if (!parsed.valid) {
        newErrors.url = 'Enter a valid linkedin.com/in/... URL'
      }
    }

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    } else if (name.trim().split(/\s+/).length < 2) {
      newErrors.name = 'Enter first and last name'
    }

    // Domain or company validation
    if (!domain.trim() && !company.trim()) {
      newErrors.domainOrCompany = 'Enter either company domain or company name'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    onLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          domain: domain.trim() || undefined,
          company: company.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        onError(data.error || 'Lookup failed')
        return
      }

      onResult(data)

      // Scroll result into view
      setTimeout(() => {
        const resultCard = document.querySelector('[data-result-card]')
        if (resultCard) {
          resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    } catch (err) {
      onError('Network error — could not reach the server.')
    } finally {
      setLoading(false)
      onLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto">
      {/* LinkedIn URL */}
      <div className="mb-4">
        <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
          LinkedIn profile URL
        </label>
        <input
          type="text"
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/jane-doe"
          className="border border-slate-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
        />
        {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url}</p>}
        <p className="text-xs text-slate-500 mt-1">
          Paste it straight from the address bar — we read the name from the URL.
        </p>
      </div>

      {/* Name and Domain (2 columns) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Jane Doe"
            className="border border-slate-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          <p className="text-xs text-slate-500 mt-1">
            {nameSource === 'url' ? 'From the URL — edit if wrong' : 'First and last name'}
          </p>
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-2">
            Company domain — acme.com
          </label>
          <input
            type="text"
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="acme.com"
            className="border border-slate-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
          />
          <p className="text-xs text-slate-500 mt-1">Where they work</p>
        </div>
      </div>

      {/* Company Name */}
      <div className="mb-4">
        <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
          Company name (only if you don&rsquo;t know the domain)
        </label>
        <input
          type="text"
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corporation"
          className="border border-slate-200 rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-400"
        />
        {errors.domainOrCompany && <p className="text-xs text-red-500 mt-1">{errors.domainOrCompany}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="bg-[#6C47FF] hover:bg-[#5B3AE8] text-white font-medium rounded-lg px-6 py-3 w-full transition-colors duration-150 text-sm disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Looking up...
          </>
        ) : (
          <>
            Find Email
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  )
}
