#!/usr/bin/env python3
"""
Integration Script: LinkedIn Collector + Linkout Email Finder
==============================================================

This script automates the process of:
1. Reading LinkedIn profiles from Excel (output of search_role_at_company.py)
2. Extracting LinkedIn URLs
3. Calling Linkout API to find emails
4. Writing results back to Excel

Usage:
    python integrate-with-linkedin-collector.py input.xlsx output.xlsx
"""

import sys
import json
import time
import requests
import pandas as pd
from pathlib import Path


def extract_domain_from_url(company_url):
    """Extract domain from LinkedIn company URL"""
    if not company_url:
        return None

    # If it's already a domain, return it
    if not company_url.startswith('http'):
        return company_url

    # Extract from URL
    try:
        from urllib.parse import urlparse
        parsed = urlparse(company_url)
        # linkedin.com/company/example-inc → example-inc
        path = parsed.path.strip('/').split('/')
        if len(path) >= 2 and path[0] == 'company':
            company_slug = path[1]
            # Try to convert slug to domain
            # This is a heuristic, user may need to verify
            return f"{company_slug.replace('-', '')}.com"
    except:
        pass

    return None


def call_linkout_api(full_name, domain=None, company=None):
    """Call Linkout API to find email"""
    url = "http://localhost:3000/api/lookup"

    payload = {"fullName": full_name}

    if domain:
        payload["domain"] = domain
    elif company:
        payload["company"] = company
    else:
        return {"error": "No domain or company provided"}

    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.json()
    except requests.exceptions.ConnectionError:
        return {"error": "Linkout API not running. Start with: cd linkout && npm run dev"}
    except Exception as e:
        return {"error": str(e)}


def process_excel(input_file, output_file, delay=2):
    """Process Excel file and add email column"""

    print(f"\n{'='*60}")
    print("  LinkedIn Collector + Linkout Integration")
    print(f"{'='*60}\n")

    # Check input file exists
    if not Path(input_file).exists():
        print(f"❌ Error: Input file not found: {input_file}")
        return False

    # Read Excel
    print(f"📂 Reading: {input_file}")
    try:
        df = pd.read_excel(input_file)
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return False

    print(f"   Found {len(df)} rows")

    # Check required columns
    required_cols = ['Full Name', 'LinkedIn URL']
    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        print(f"❌ Error: Missing columns: {missing}")
        print(f"   Available columns: {list(df.columns)}")
        return False

    # Add email columns if they don't exist
    if 'Email' not in df.columns:
        df['Email'] = ''
    if 'Email Confidence' not in df.columns:
        df['Email Confidence'] = ''
    if 'Email Source' not in df.columns:
        df['Email Source'] = ''

    # Process each row
    print(f"\n🔍 Finding emails...\n")

    found_count = 0
    not_found_count = 0
    error_count = 0

    for index, row in df.iterrows():
        name = row.get('Full Name', '')
        linkedin_url = row.get('LinkedIn URL', '')
        company_url = row.get('Company URL', '') or row.get('company_url', '')

        if not name or not linkedin_url:
            print(f"  [{index+1}/{len(df)}] ⚠️  Skipping (missing name or URL)")
            continue

        # Skip if email already exists
        if pd.notna(row.get('Email')) and row.get('Email').strip():
            print(f"  [{index+1}/{len(df)}] ⏭️  {name[:30]:30} | Already has email")
            found_count += 1
            continue

        # Extract domain from company URL
        domain = extract_domain_from_url(company_url)
        company_name = row.get('Company (requested)', '') or row.get('Matched Company Line', '')

        print(f"  [{index+1}/{len(df)}] 🔎 {name[:30]:30} | ", end='', flush=True)

        # Call Linkout API
        result = call_linkout_api(name, domain=domain, company=company_name if not domain else None)

        if 'error' in result:
            print(f"❌ {result['error'][:40]}")
            df.at[index, 'Email Source'] = f"Error: {result['error']}"
            error_count += 1
        elif result.get('found'):
            data = result.get('data', {})
            email = data.get('email', '')
            score = data.get('score', '')
            source = data.get('sources', [{}])[0].get('domain', '') if data.get('sources') else ''

            df.at[index, 'Email'] = email
            df.at[index, 'Email Confidence'] = score
            df.at[index, 'Email Source'] = source

            print(f"✅ {email} ({score}%)")
            found_count += 1
        else:
            print(f"⚫ Not found")
            df.at[index, 'Email Source'] = 'Not found in Hunter.io'
            not_found_count += 1

        # Delay to avoid rate limiting
        if index < len(df) - 1:
            time.sleep(delay)

    # Save results
    print(f"\n💾 Saving results to: {output_file}")
    try:
        df.to_excel(output_file, index=False)
        print(f"   ✅ Saved successfully\n")
    except Exception as e:
        print(f"   ❌ Error saving: {e}\n")
        return False

    # Summary
    print(f"{'='*60}")
    print("  SUMMARY")
    print(f"{'='*60}\n")
    print(f"  Total rows:       {len(df)}")
    print(f"  Emails found:     {found_count} ({found_count/len(df)*100:.1f}%)")
    print(f"  Not found:        {not_found_count} ({not_found_count/len(df)*100:.1f}%)")
    print(f"  Errors:           {error_count}")
    print(f"\n  Output file:      {output_file}")
    print(f"{'='*60}\n")

    return True


def main():
    if len(sys.argv) < 3:
        print("\nUsage:")
        print("  python integrate-with-linkedin-collector.py INPUT.xlsx OUTPUT.xlsx\n")
        print("Example:")
        print("  python integrate-with-linkedin-collector.py role_at_company_2026-08-14.xlsx complete_leads.xlsx\n")
        return

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    # Run integration
    success = process_excel(input_file, output_file)

    if success:
        print("🎉 Integration complete!\n")
        print("Next steps:")
        print("  1. Open the output file in Excel")
        print("  2. Review the emails and confidence scores")
        print("  3. Start your outreach campaign\n")
    else:
        print("❌ Integration failed. Check errors above.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
