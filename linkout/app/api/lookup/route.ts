import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { fullName, firstName, lastName, domain, company } = await request.json()

  const name: string = (fullName ?? '').trim()
  const hasSplitName = firstName?.trim() && lastName?.trim()

  if (!name && !hasSplitName) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 })
  }

  if (name && !hasSplitName && name.split(/\s+/).length < 2) {
    return NextResponse.json(
      { error: 'Enter a first and last name — the profile URL did not contain both.' },
      { status: 400 }
    )
  }

  if (!domain?.trim() && !company?.trim()) {
    return NextResponse.json(
      { error: 'Company domain or company name is required.' },
      { status: 400 }
    )
  }

  // Without this guard a missing key falls through to Hunter and returns a bare 401.
  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json(
      { error: 'API key missing — add HUNTER_API_KEY to .env.local and restart.' },
      { status: 500 }
    )
  }

  const params = new URLSearchParams({ api_key: process.env.HUNTER_API_KEY })

  if (hasSplitName) {
    params.set('first_name', firstName.trim())
    params.set('last_name', lastName.trim())
  } else {
    params.set('full_name', name)
  }

  if (domain?.trim()) {
    params.set('domain', domain.trim())
  } else {
    params.set('company', company.trim())
  }

  try {
    const response = await fetch(`https://api.hunter.io/v2/email-finder?${params}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.errors?.[0]?.details || 'Could not find email.' },
        { status: response.status }
      )
    }

    // Hunter returns 200 with a null email when it knows the person but
    // cannot confirm an address.
    if (!data.data?.email) {
      return NextResponse.json({ found: false, data: data.data })
    }

    return NextResponse.json({ found: true, data: data.data })
  } catch {
    return NextResponse.json(
      { error: 'Network error — could not reach Hunter.io.' },
      { status: 500 }
    )
  }
}
