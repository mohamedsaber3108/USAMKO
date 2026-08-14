#!/usr/bin/env python3
"""
LinkedIn + Linkout Integration Script
======================================

Automatically finds emails for people in LinkedIn Excel exports.

Usage:
    python integrate-with-linkedin-collector.py input.xlsx output.xlsx

Input: Excel from LinkedIn collector (discover_companies.py or search_role_at_company.py)
Output: Same data with additional email columns

Requires:
- Linkout API running on http://localhost:3000
- Hunter.io API key configured in Linkout
"""

import pandas as pd
import requests
import sys
import time
from pathlib import Path

# Configuration
LINKOUT_API_URL = "http://localhost:3000/api/lookup"
DELAY_BETWEEN_REQUESTS = 1  # seconds (to respect rate limits)

def extract_domain_from_company_url(company_url):
    """Extract domain from LinkedIn company URL or website"""
    if not company_url or pd.isna(company_url):
        return None

    # Remove protocol
    domain = company_url.replace('https://', '').replace('http://', '')

    # If it's a LinkedIn URL, skip it
    if 'linkedin.com' in domain:
        return None

    # Get base domain
    domain = domain.split('/')[0]

    return domain if domain else None

def find_email_via_linkout(full_name, domain, company_name=None):
    """
    Call Linkout API to find email

    Args:
        full_name: Person's full name
        domain: Company domain (e.g., "acme.com")
        company_name: Company name (optional, helps matching)

    Returns:
        dict with email, confidence, source, or None if not found
    """
    try:
        # Prepare request
        payload = {
            "fullName": full_name,
            "domain": domain
        }

        if company_name:
            payload["company"] = company_name

        # Call API
        response = requests.post(LINKOUT_API_URL, json=payload, timeout=10)

        if response.status_code == 200:
            data = response.json()

            if data.get('found'):
                email_data = data.get('data', {})
                return {
                    'email': email_data.get('email'),
                    'confidence': email_data.get('score', 0),
                    'source': email_data.get('sources', [{}])[0].get('uri', ''),
                    'first_name': email_data.get('first_name'),
                    'last_name': email_data.get('last_name')
                }

        return None

    except Exception as e:
        print(f"⚠️  Error calling Linkout API: {e}")
        return None

def process_linkedin_export(input_file, output_file):
    """
    Process LinkedIn export and enrich with emails

    Args:
        input_file: Path to Excel file from LinkedIn collector
        output_file: Path to save enriched Excel file
    """
    print(f"\n📂 Reading: {input_file}")

    # Read Excel
    df = pd.read_excel(input_file)

    print(f"✅ Found {len(df)} people")

    # Add email columns
    df['Email'] = None
    df['Email Confidence'] = None
    df['Email Source'] = None

    # Determine columns (different scripts use different names)
    name_col = 'Full Name' if 'Full Name' in df.columns else 'Name'
    company_col = 'Company (requested)' if 'Company (requested)' in df.columns else 'Company'

    # Check if we have required columns
    if name_col not in df.columns:
        print("❌ Error: Could not find name column")
        return

    # Process each person
    found_count = 0

    for idx, row in df.iterrows():
        full_name = row.get(name_col)
        company_name = row.get(company_col)

        if not full_name or pd.isna(full_name):
            continue

        print(f"\n[{idx + 1}/{len(df)}] {full_name}")

        # Try to get domain from company URL or website
        domain = None

        # Check various possible domain sources
        for col in ['Company URL', 'Website', 'Company Website']:
            if col in df.columns and row.get(col):
                domain = extract_domain_from_company_url(row[col])
                if domain:
                    break

        # If no domain, try to use company name to guess
        if not domain and company_name and not pd.isna(company_name):
            # Basic guess: company-name.com
            domain = company_name.lower().replace(' ', '').replace(',', '') + '.com'
            print(f"   Guessing domain: {domain}")

        if not domain:
            print("   ⚠️  No domain available, skipping")
            continue

        # Find email
        print(f"   Looking up email at {domain}...")

        result = find_email_via_linkout(full_name, domain, company_name)

        if result:
            df.at[idx, 'Email'] = result['email']
            df.at[idx, 'Email Confidence'] = result['confidence']
            df.at[idx, 'Email Source'] = result['source']

            print(f"   ✅ Found: {result['email']} (confidence: {result['confidence']}%)")
            found_count += 1
        else:
            print(f"   ❌ Not found")

        # Rate limiting
        time.sleep(DELAY_BETWEEN_REQUESTS)

    # Save result
    print(f"\n💾 Saving to: {output_file}")
    df.to_excel(output_file, index=False)

    print(f"\n✅ Complete!")
    print(f"   Total people: {len(df)}")
    print(f"   Emails found: {found_count}")
    print(f"   Success rate: {(found_count / len(df) * 100):.1f}%")

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python integrate-with-linkedin-collector.py input.xlsx [output.xlsx]")
        print("\nExamples:")
        print("  python integrate-with-linkedin-collector.py role_at_company.xlsx")
        print("  python integrate-with-linkedin-collector.py people.xlsx complete_leads.xlsx")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.xlsx', '_with_emails.xlsx')

    # Check if input exists
    if not Path(input_file).exists():
        print(f"❌ Error: File not found: {input_file}")
        sys.exit(1)

    # Check if Linkout is running
    print("🔍 Checking Linkout API...")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        print("✅ Linkout is running")
    except:
        print("❌ Error: Linkout is not running!")
        print("\nPlease start Linkout first:")
        print("  cd m:/USAMKO/linkout")
        print("  npm run dev")
        sys.exit(1)

    # Process
    process_linkedin_export(input_file, output_file)

if __name__ == '__main__':
    main()
