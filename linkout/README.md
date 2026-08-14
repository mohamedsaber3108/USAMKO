# 🔗 Linkout - LinkedIn Email Finder

**Find anyone's work email directly from their LinkedIn profile — instantly.**

Linkout is a professional email finding tool powered by Hunter.io that turns LinkedIn profiles into verified contacts in seconds.

---

## ✨ Features

- **🎯 LinkedIn Profile Parser** - Paste a LinkedIn URL, automatically extract the name
- **📧 Email Discovery** - Find verified work emails using Hunter.io's database
- **✅ Confidence Scoring** - Get reliability scores for every email found
- **📊 Source Verification** - See where the email was found and when
- **🎨 Beautiful UI** - Dark cinematic landing page + clean tool interface
- **⚡ Instant Copy** - One-click email copying with fallback support

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Hunter.io API Key** - [Get free key](https://hunter.io) (50 searches/month)

### Installation

```bash
# Navigate to linkout directory
cd m:/USAMKO/linkout

# Install dependencies
npm install

# Set up your API key
# Edit .env.local and add your Hunter.io API key
```

### Configuration

Edit `.env.local`:

```env
HUNTER_API_KEY=your_hunter_api_key_here
```

Get your free API key:
1. Sign up at https://hunter.io (no credit card required)
2. Go to Dashboard → API
3. Copy your API key
4. Paste it in `.env.local`

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

Open [http://localhost:3000/find](http://localhost:3000/find) to use the tool.

---

## 📖 How to Use

### Method 1: Web Interface

1. Go to `/find` page
2. Paste a LinkedIn profile URL (e.g., `https://www.linkedin.com/in/jane-doe`)
3. Name is auto-extracted from URL
4. Enter company domain (e.g., `acme.com`) or company name
5. Click "Find Email"
6. Copy the verified email with one click

### Method 2: API (Programmatic Access)

```bash
curl -X POST http://localhost:3000/api/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "domain": "acme.com"
  }'
```

**Response:**

```json
{
  "found": true,
  "data": {
    "email": "jane.doe@acme.com",
    "score": 95,
    "position": "CEO",
    "company": "Acme Corporation",
    "verification": {
      "status": "valid"
    },
    "sources": [...]
  }
}
```

---

## 🔌 Integration with LinkedIn Lead Collector

Linkout works perfectly with the LinkedIn Lead Collector Python scripts!

### Complete Workflow

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Discover Companies (Python Script)         │
│ → Run discover_companies.py                        │
│ → Get list of companies in target location/industry│
│ → Output: companies_YYYY-MM-DD.xlsx                │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Find People at Companies (Python Script)   │
│ → Run search_role_at_company.py                    │
│ → Input: Company names from Step 1                 │
│ → Get LinkedIn profiles of key people              │
│ → Output: role_at_company_YYYY-MM-DD.xlsx          │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Get Emails (Linkout Web App)               │
│ → Use Linkout to find emails for each profile      │
│ → Input: LinkedIn URLs from Step 2                 │
│ → Output: Verified work emails                     │
└─────────────────────────────────────────────────────┘
```

### Example Usage

**1. Find Ed-Tech Companies in Egypt:**

```bash
cd "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
python discover_companies.py
```

Input:
```
> 1
Enter target industry / keyword: education technology
Enter location filter: Egypt
Enter industry type filter: Education
How many companies to collect? 30
```

Output: `companies_2026-08-14.xlsx` with 30 Egyptian ed-tech companies

**2. Find Founders/CEOs at Those Companies:**

```bash
python search_role_at_company.py
```

Input:
```
Company name(s): EdTech Egypt, Cairo Learning Center, ...
Role(s) to find: Founder, CEO
Max verified people: 5
```

Output: `role_at_company_2026-08-14.xlsx` with verified LinkedIn profiles

**3. Get Their Emails Using Linkout:**

```bash
cd m:/USAMKO/linkout
npm run dev
```

Then for each LinkedIn profile URL from Step 2:
1. Open http://localhost:3000/find
2. Paste LinkedIn URL: `https://www.linkedin.com/in/ahmed-hassan`
3. Enter company domain: `edtechegypt.com`
4. Get verified email: `ahmed.hassan@edtechegypt.com`

---

## 📊 Technical Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS 3, Framer Motion (motion)
- **Icons:** lucide-react
- **API:** Hunter.io Email Finder API
- **Optional:** Supabase (waitlist functionality)

---

## 🗂️ Project Structure

```
linkout/
├── app/
│   ├── layout.tsx              # Root layout with Inter font
│   ├── globals.css             # Tailwind + landing page styles
│   ├── page.tsx                # Landing page
│   ├── find/
│   │   ├── layout.tsx          # Light theme wrapper for tool
│   │   └── page.tsx            # Email finder tool
│   └── api/
│       └── lookup/
│           └── route.ts        # Hunter.io proxy API
├── components/
│   ├── LookupForm.tsx          # Main form with validation
│   ├── ResultCard.tsx          # Found/not-found/error states
│   └── ConfidenceBadge.tsx     # Score indicator
├── lib/
│   ├── hunter.ts               # Hunter.io types
│   └── linkedin.ts             # URL parser
├── .env.local                  # API keys (never commit)
└── README.md                   # This file
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUNTER_API_KEY` | **Yes** | Your Hunter.io API key |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (waitlist) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon key (waitlist) |

---

## 🎯 API Routes

### POST /api/lookup

Find email for a person at a company.

**Request Body:**

```json
{
  "fullName": "Jane Doe",          // Required: First and last name
  "domain": "acme.com",             // Preferred: Company domain
  "company": "Acme Corporation"     // Alternative: Company name
}
```

**Response (Success):**

```json
{
  "found": true,
  "data": {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane.doe@acme.com",
    "score": 95,
    "domain": "acme.com",
    "position": "CEO",
    "company": "Acme Corporation",
    "linkedin_url": "https://linkedin.com/in/jane-doe",
    "verification": {
      "date": "2026-08-14",
      "status": "valid"
    },
    "sources": [
      {
        "domain": "acme.com",
        "uri": "https://acme.com/team",
        "last_seen_on": "2026-08-10",
        "still_on_page": true
      }
    ]
  }
}
```

**Response (Not Found):**

```json
{
  "found": false,
  "data": null
}
```

**Response (Error):**

```json
{
  "error": "A name is required."
}
```

---

## ⚠️ Known Limitations

### 1. Company Domain Required

- **Issue:** The company cannot be derived from the LinkedIn URL alone
- **Why:** LinkedIn doesn't expose company details without authentication
- **Solution:** User must manually enter the company domain or name

### 2. Hunter.io Coverage

- **Uneven Coverage:** Results vary by region and company size
- **Best Results:** US/EU tech companies with public web presence
- **Lower Coverage:** Smaller firms, some regions, stealth-mode startups
- **Recommendation:** Test with real data before relying on it

### 3. Free Tier Limits

- **50 searches/month** on Hunter.io free plan
- Only successful lookups count (not-found results are free)
- Upgrade to Standard ($49/mo) for 500 searches

---

## 🧪 Testing

### Test the LinkedIn Parser

```typescript
import { parseLinkedInUrl } from '@/lib/linkedin'

parseLinkedInUrl('https://www.linkedin.com/in/jane-doe')
// → { name: "Jane Doe", slug: "jane-doe", valid: true }

parseLinkedInUrl('https://www.linkedin.com/in/john-smith-8a4b21/')
// → { name: "John Smith", slug: "john-smith-8a4b21", valid: true }

parseLinkedInUrl('not a url')
// → { name: null, slug: null, valid: false }
```

### Test the API (requires HUNTER_API_KEY)

```bash
# Start dev server
npm run dev

# Test with Hunter.io co-founder (always returns data)
curl -s -X POST http://localhost:3000/api/lookup \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Antoine Finkelstein","domain":"hunter.io"}' | jq

# Expected: found: true, email, score 90+, verification: "valid"
```

---

## 🚀 Deployment

### Production Build

```bash
# Stop dev server first (important!)
npm run build

# Start production server
npm run start
```

### Environment Variables for Production

```env
HUNTER_API_KEY=your_real_api_key
NODE_ENV=production
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add `HUNTER_API_KEY` to Vercel environment variables.

---

## 🐛 Troubleshooting

### "API key missing" error

**Problem:** `HUNTER_API_KEY` not set in `.env.local`

**Solution:**
1. Copy `.env.example` to `.env.local`
2. Add your Hunter.io API key
3. Restart the dev server (`npm run dev`)

### Name not auto-filling from URL

**Problem:** LinkedIn URL slug doesn't contain a parseable name

**Example:** `linkedin.com/in/janedoe` (no hyphens)

**Solution:** Manually type the person's name in the Name field

### "No CSS" after build

**Problem:** Ran `npm run build` while `npm run dev` was running

**Solution:**
```bash
rm -rf .next
npm run dev
```

Never run build and dev server simultaneously.

### Email not found

**Possible reasons:**
1. Person doesn't have a public work email
2. Company domain is wrong (try company name instead)
3. Name spelling is incorrect
4. Person/company not in Hunter.io's database

**Try:**
- Use exact company domain (e.g., `acme.com` not `www.acme.com`)
- Try company name instead of domain
- Verify person's name from their LinkedIn profile

---

## 📜 License

MIT License - See LICENSE file for details.

---

## 🙏 Credits

- **Hunter.io** - Email finding API
- **Next.js** - React framework
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

---

## 📞 Support

- **Documentation:** This README
- **Issues:** Check troubleshooting section above
- **Hunter.io API:** https://hunter.io/api-documentation
- **Next.js Docs:** https://nextjs.org/docs

---

## 🎯 What's Next?

### Recommended Enhancements

1. **Bulk Processing**
   - Upload CSV of LinkedIn URLs
   - Process all in batch
   - Export results to Excel

2. **Browser Extension**
   - Find emails directly from LinkedIn pages
   - One-click integration with current tab

3. **CRM Integration**
   - Export to Salesforce/HubSpot
   - Sync contacts automatically

4. **Enhanced Analytics**
   - Success rate tracking
   - Domain coverage reports
   - API usage dashboard

---

**Built with ❤️ for lead generation professionals**

**Version:** 1.0.0  
**Last Updated:** 2026-08-14  
**Status:** ✅ Production Ready
