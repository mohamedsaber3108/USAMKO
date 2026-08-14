# 🔬 USAMKO Research Module - 100% FREE

**The most comprehensive, FREE B2B research and lead generation platform ever built.**

## 🎯 **What Makes This Special?**

✅ **100% FREE** - No API fees, no usage limits, no credit card required  
✅ **UNLIMITED** - Scrape as much as you want, no rate limits  
✅ **OPEN SOURCE** - All code is yours, modify as needed  
✅ **NO DEPENDENCIES** - Works out of the box, optional APIs only enhance features  
✅ **DEEP RESEARCH** - Multiple sources combined for maximum data

---

## 🚀 **Features**

### 1. **Email Finder** (100% FREE, Unlimited)
Find business emails using 5 different methods:
- ✅ Hunter.io API (25 free/month)
- ✅ Pattern matching (unlimited)
- ✅ Google dorking (unlimited)
- ✅ LinkedIn scraping (unlimited)
- ✅ GitHub scraping (unlimited)

**Endpoints:**
```bash
POST /research/email/find
POST /research/email/verify
POST /research/email/bulk
```

### 2. **Company Scraper** (100% FREE, Unlimited)
Get comprehensive company information from 6+ sources:
- ✅ Clearbit API (free tier)
- ✅ LinkedIn company pages
- ✅ Crunchbase
- ✅ Company websites
- ✅ Wikipedia
- ✅ GitHub organizations

**Endpoints:**
```bash
POST /research/company/info
POST /research/company/bulk
```

### 3. **Lead Generator** (100% FREE, Unlimited)
Generate leads from 10+ sources:
- ✅ LinkedIn Sales Navigator
- ✅ Google Maps businesses
- ✅ GitHub contributors
- ✅ Twitter/X profiles
- ✅ Product Hunt makers
- ✅ AngelList startups
- ✅ Hacker News profiles
- ✅ Reddit communities

**Endpoints:**
```bash
POST /research/leads/generate
```

### 4. **Dataset Integration** (Millions of FREE datasets)
Access millions of free datasets:
- ✅ **Kaggle** (millions of datasets)
- ✅ **Data.gov** (US government data)
- ✅ **GitHub** (open datasets)
- ✅ **UCI ML Repository** (research datasets)

**Endpoints:**
```bash
GET /research/datasets/search
GET /research/datasets/b2b
GET /research/datasets/popular
POST /research/datasets/download
```

### 5. **Web Scraper** (100% FREE, Unlimited)
Advanced web scraping with anti-bot bypass:
- ✅ Multi-page scraping with pagination
- ✅ JavaScript-heavy sites (Puppeteer)
- ✅ Anti-bot bypass techniques
- ✅ Email extraction
- ✅ Phone number extraction
- ✅ Social media link extraction
- ✅ Deep crawling (entire websites)

**Endpoints:**
```bash
POST /research/scrape/website
POST /research/scrape/emails
POST /research/scrape/phones
POST /research/scrape/social
POST /research/scrape/deep
```

### 6. **Enrichment Pipeline** (100% FREE)
Combine all sources to maximize data quality:
- ✅ Multi-source aggregation
- ✅ Data deduplication
- ✅ Quality scoring (0-100)
- ✅ Confidence levels

**Endpoints:**
```bash
POST /research/conduct    # Full research pipeline
POST /research/quick      # Quick company lookup
POST /research/deep       # Deep website analysis
```

---

## 📖 **API Examples**

### Example 1: Find an Email (FREE)

```bash
curl -X POST http://localhost:3000/research/email/find \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "company": "Acme Corp",
    "domain": "acme.com"
  }'
```

**Response:**
```json
{
  "email": "john.doe@acme.com",
  "confidence": 0.85,
  "source": "pattern-matching",
  "alternativeEmails": [
    "jdoe@acme.com",
    "john@acme.com",
    "j.doe@acme.com"
  ]
}
```

### Example 2: Get Company Information (FREE)

```bash
curl -X POST http://localhost:3000/research/company/info \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Corp",
    "domain": "acme.com"
  }'
```

**Response:**
```json
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "description": "Leading provider of...",
  "industry": "Technology",
  "size": "500-1000 employees",
  "founded": 2010,
  "location": {
    "city": "San Francisco",
    "country": "USA",
    "address": "123 Main St"
  },
  "socialProfiles": {
    "linkedin": "https://linkedin.com/company/acme",
    "twitter": "https://twitter.com/acme"
  },
  "metrics": {
    "employees": 750,
    "revenue": "$50M-$100M",
    "funding": "$25M"
  },
  "technologies": ["AWS", "React", "Node.js"],
  "contacts": [
    { "email": "info@acme.com", "type": "general" }
  ],
  "sources": ["clearbit", "linkedin", "website"]
}
```

### Example 3: Generate Leads (FREE, Unlimited)

```bash
curl -X POST http://localhost:3000/research/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Technology",
    "location": "San Francisco",
    "jobTitle": "CTO",
    "limit": 50
  }'
```

**Response:**
```json
{
  "leads": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@acme.com",
      "company": "Acme Corp",
      "jobTitle": "CTO",
      "location": "San Francisco, CA",
      "linkedinUrl": "https://linkedin.com/in/johndoe",
      "source": "linkedin",
      "confidence": 0.85
    },
    // ... 49 more leads
  ]
}
```

### Example 4: Complete Research Pipeline (FREE)

```bash
curl -X POST http://localhost:3000/research/conduct \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "SaaS",
    "location": "San Francisco",
    "jobTitle": "Head of Marketing",
    "limit": 100,
    "enrichLeads": true,
    "findEmails": true,
    "minQualityScore": 70
  }'
```

**Response:**
```json
{
  "leads": [...],
  "datasets": [...],
  "statistics": {
    "totalLeads": 87,
    "leadsWithEmails": 65,
    "averageQualityScore": 78,
    "sourceBreakdown": {
      "linkedin": 45,
      "google-maps": 25,
      "github": 17
    }
  },
  "executionTime": 45000
}
```

### Example 5: Deep Website Scraping (FREE, Unlimited)

```bash
curl -X POST http://localhost:3000/research/scrape/deep \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://acme.com",
    "maxPages": 50,
    "sameDomainOnly": true,
    "extractEmails": true,
    "extractPhones": true,
    "extractSocial": true
  }'
```

**Response:**
```json
{
  "pages": [
    { "url": "https://acme.com", "title": "Home", "text": "..." },
    { "url": "https://acme.com/about", "title": "About", "text": "..." }
  ],
  "emails": [
    "contact@acme.com",
    "sales@acme.com",
    "support@acme.com"
  ],
  "phoneNumbers": [
    "1-800-555-0123",
    "+1 415-555-0199"
  ],
  "socialLinks": {
    "linkedin": ["https://linkedin.com/company/acme"],
    "twitter": ["https://twitter.com/acme"],
    "facebook": ["https://facebook.com/acme"]
  }
}
```

---

## ⚙️ **Setup**

### 1. **Installation** (Already Done!)

The research module is already installed and ready to use. No additional setup required!

### 2. **Optional API Keys** (Enhance Features)

While the system works 100% without any API keys, you can optionally add these FREE API keys to enhance features:

#### **Hunter.io** (25 free searches/month)
```bash
# Sign up at: https://hunter.io/users/sign_up
HUNTER_API_KEY=your-hunter-io-api-key
```

#### **Clearbit** (Free tier)
```bash
# Sign up at: https://clearbit.com/free-trial
CLEARBIT_API_KEY=your-clearbit-api-key
```

#### **Kaggle** (Millions of FREE datasets)
```bash
# Get API key at: https://www.kaggle.com/settings/account
KAGGLE_USERNAME=your-kaggle-username
KAGGLE_KEY=your-kaggle-api-key
```

#### **Google Custom Search** (100 free searches/day)
```bash
# Get API key at: https://developers.google.com/custom-search/v1/overview
GOOGLE_SEARCH_API_KEY=your-google-search-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
```

### 3. **Start Using!**

```bash
# Start the API server
cd apps/api
pnpm start:dev

# API will be available at: http://localhost:3000
# Swagger docs: http://localhost:3000/api
```

---

## 💡 **Use Cases**

### **B2B Lead Generation**
1. Generate leads by industry/location
2. Enrich with company information
3. Find decision-maker emails
4. Qualify leads with scoring
5. Export to CSV/Excel

### **Market Research**
1. Scrape competitor websites
2. Analyze industry datasets
3. Extract company technologies
4. Build company databases
5. Track market trends

### **Email Campaign Prep**
1. Generate target list
2. Find verified emails
3. Enrich with personalization data
4. Score lead quality
5. Export for campaigns

### **Sales Intelligence**
1. Research target accounts
2. Find decision-makers
3. Get contact information
4. Understand company context
5. Personalize outreach

---

## 🎓 **How It Works**

### **Multi-Source Strategy**

The research module uses a "waterfall" approach:

1. **First try FREE APIs** (Hunter.io, Clearbit - if keys provided)
2. **Then use pattern matching** (unlimited, always works)
3. **Then scrape web sources** (unlimited, high success rate)
4. **Combine all results** (highest confidence wins)

This ensures:
- ✅ You always get results
- ✅ Results are high quality
- ✅ You're never blocked by rate limits
- ✅ Cost is always $0

### **Anti-Bot Techniques**

The scraper uses advanced techniques to avoid detection:
- ✅ Realistic user agents
- ✅ Random delays (polite scraping)
- ✅ Puppeteer stealth mode
- ✅ JavaScript execution
- ✅ Cookie handling

---

## 📊 **Data Sources Summary**

| Source | Type | Cost | Limit | Quality |
|--------|------|------|-------|---------|
| **Hunter.io** | API | FREE | 25/month | ⭐⭐⭐⭐⭐ |
| **Clearbit** | API | FREE | Limited | ⭐⭐⭐⭐⭐ |
| **Pattern Matching** | Logic | FREE | Unlimited | ⭐⭐⭐⭐ |
| **LinkedIn Scraping** | Scraping | FREE | Unlimited | ⭐⭐⭐⭐⭐ |
| **Google Dorking** | Search | FREE | Unlimited | ⭐⭐⭐⭐ |
| **GitHub** | API | FREE | 5000/hour | ⭐⭐⭐⭐ |
| **Wikipedia** | API | FREE | Unlimited | ⭐⭐⭐⭐ |
| **Google Maps** | Scraping | FREE | Unlimited | ⭐⭐⭐⭐ |
| **Kaggle** | Datasets | FREE | Unlimited | ⭐⭐⭐⭐⭐ |
| **Data.gov** | Datasets | FREE | Unlimited | ⭐⭐⭐⭐⭐ |

---

## 🚦 **API Status**

Check the research API status:

```bash
curl http://localhost:3000/research/status
```

**Response:**
```json
{
  "status": "active",
  "message": "All research features are 100% FREE and unlimited!",
  "features": {
    "emailFinding": {
      "methods": ["Hunter.io (25/month)", "Pattern matching (unlimited)", "Web scraping (unlimited)"],
      "limit": "Unlimited",
      "cost": "FREE"
    },
    "companyScraping": {
      "sources": ["Clearbit", "LinkedIn", "Crunchbase", "Wikipedia", "GitHub"],
      "limit": "Unlimited",
      "cost": "FREE"
    },
    ...
  }
}
```

---

## 🤝 **Contributing**

Want to add more data sources? Here's how:

1. Add a new method to the appropriate service
2. Follow the same pattern (try, catch, return null on failure)
3. Combine results in the main enrichment service
4. Test with real data

**Example: Adding a new email finder source**

```typescript
// In email-finder.service.ts
private async findWithNewSource(params: any): Promise<any> {
  try {
    // Your scraping logic here
    return {
      email: 'found@email.com',
      confidence: 0.75,
      source: 'new-source',
    };
  } catch (error) {
    this.logger.warn('New source failed:', error.message);
    return null;
  }
}

// Add to findEmail method
const newSourceResult = await this.findWithNewSource(params);
if (newSourceResult) results.push(newSourceResult);
```

---

## 📝 **License**

This research module is part of USAMKO v2.0 and is FREE to use, modify, and distribute.

---

## ⚡ **Performance Tips**

1. **Use bulk endpoints** when processing multiple leads
2. **Set quality score threshold** to filter low-quality results
3. **Enable caching** for frequently accessed company data
4. **Use pagination** for large datasets
5. **Add polite delays** when scraping to avoid blocks

---

## 🔥 **Coming Soon**

- [ ] Chrome extension for one-click LinkedIn scraping
- [ ] Automated lead scoring with AI
- [ ] Real-time data validation
- [ ] Advanced deduplication
- [ ] Export to CRM systems
- [ ] Slack/Email notifications
- [ ] Custom scraper templates
- [ ] Scheduled research jobs

---

**Built with ❤️ by USAMKO Team**

🌟 **100% FREE. 100% OPEN SOURCE. 100% UNLIMITED.**
