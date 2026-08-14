export interface HunterSource {
  domain: string
  uri: string
  extracted_on: string
  last_seen_on: string
  still_on_page: boolean
}

export interface HunterVerification {
  date: string | null
  status: 'valid' | 'invalid' | 'risky' | 'unknown' | null
}

export interface HunterData {
  first_name: string | null
  last_name: string | null
  email: string | null
  score: number | null
  domain: string
  position: string | null
  company: string | null
  linkedin_url: string | null
  twitter: string | null
  phone_number: string | null
  accept_all: boolean | null
  source_type: string | null
  sources: HunterSource[]
  verification: HunterVerification | null
}

export interface HunterResult {
  found: boolean
  data: HunterData | null
}
