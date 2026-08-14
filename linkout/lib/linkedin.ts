/** Trailing slug tokens LinkedIn appends for uniqueness — not part of a name. */
function isNoiseToken(token: string): boolean {
  if (!token) return true
  if (/^\d+$/.test(token)) return true
  if (/\d/.test(token) && token.length <= 12) return true
  return false
}

function titleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

export interface ParsedProfile {
  name: string | null   // best-effort person name, null if unusable
  slug: string | null
  valid: boolean        // did the input look like a profile URL at all
}

export function parseLinkedInUrl(input: string): ParsedProfile {
  const raw = input.trim()
  if (!raw) return { name: null, slug: null, valid: false }

  const match = raw.match(/linkedin\.com\/in\/([^/?#\s]+)/i)
  if (!match) return { name: null, slug: null, valid: false }

  let slug: string
  try {
    slug = decodeURIComponent(match[1])
  } catch {
    slug = match[1]
  }

  const tokens = slug.split('-').filter(Boolean)

  // Drop trailing id tokens, but never strip everything.
  while (tokens.length > 1 && isNoiseToken(tokens[tokens.length - 1])) {
    tokens.pop()
  }

  // A run-together token ("janedoe") cannot be split reliably — hand it back.
  if (tokens.length < 2) return { name: null, slug, valid: true }

  return { name: tokens.map(titleCase).join(' '), slug, valid: true }
}
