import { NextRequest, NextResponse } from 'next/server'
import { findEmailFree, verifyEmailFree } from '@/lib/free-email-finder'

/**
 * 100% FREE Email Lookup API
 * NO PAID SERVICES REQUIRED!
 *
 * Combines 10+ free methods:
 * - Pattern matching (instant)
 * - Website scraping
 * - GitHub search
 * - Social media
 * - Clearbit free tier (50/month)
 * - EmailRep verification
 *
 * Usage:
 * POST /api/lookup-free
 * {
 *   "fullName": "John Doe",
 *   "domain": "company.com",
 *   "company": "Company Inc"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { fullName, firstName, lastName, domain, company } = await request.json()

    // Parse name
    let fn = firstName
    let ln = lastName

    if (!fn || !ln) {
      const parts = (fullName || '').trim().split(/\s+/)
      if (parts.length < 2) {
        return NextResponse.json(
          { error: 'Please provide first and last name' },
          { status: 400 }
        )
      }
      fn = parts[0]
      ln = parts.slice(1).join(' ')
    }

    if (!domain && !company) {
      return NextResponse.json(
        { error: 'Company domain or name is required' },
        { status: 400 }
      )
    }

    // Find email using FREE methods
    const result = await findEmailFree({
      firstName: fn,
      lastName: ln,
      company: company || domain || '',
      domain: domain,
    })

    if (!result.email) {
      return NextResponse.json({
        found: false,
        message: 'No email found using free methods',
        methods: result.methods,
        suggestions: result.alternativeEmails.slice(0, 5).map(r => ({
          email: r.email,
          confidence: r.confidence,
          source: r.source,
        })),
      })
    }

    // Verify the email
    const verification = await verifyEmailFree(result.email)

    return NextResponse.json({
      found: true,
      data: {
        email: result.email,
        confidence: result.confidence,
        source: result.source,
        methods: result.methods,
        verification: {
          valid: verification.valid,
          exists: verification.exists,
          reputation: verification.reputation,
          score: verification.score,
        },
        alternativeEmails: result.alternativeEmails.slice(0, 5).map(r => ({
          email: r.email,
          confidence: r.confidence,
          source: r.source,
        })),
      },
    })
  } catch (error: any) {
    console.error('Free email lookup error:', error)
    return NextResponse.json(
      { error: error.message || 'Email lookup failed' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for testing
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: '100% FREE Email Finder',
    methods: [
      'Pattern Matching (instant, unlimited)',
      'Website Scraping (unlimited)',
      'GitHub Search (unlimited)',
      'Social Media (unlimited)',
      'Clearbit Free (50/month)',
      'EmailRep Verification (unlimited)',
    ],
    cost: '$0',
    limits: 'Unlimited (be polite with rate limits)',
    usage: {
      endpoint: 'POST /api/lookup-free',
      body: {
        fullName: 'John Doe',
        domain: 'company.com',
        company: 'Company Inc (optional)',
      },
    },
  })
}
