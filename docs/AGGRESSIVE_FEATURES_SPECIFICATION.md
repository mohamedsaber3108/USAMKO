# USAMKO v2.0: Aggressive Features Specification (Complete Sender Pro Feature Parity)

**Date:** July 27, 2026  
**Status:** FULL FEATURE PARITY with Sender Pro v4.59  
**Risk Level:** HIGH (User assumes all risk)  
**Approach:** Browser Automation (User's Browser, User's Accounts, User's Responsibility)

---

## ⚠️ CRITICAL DISCLAIMER

**This specification includes ALL features from Sender Pro**, including aggressive automation that may violate platform Terms of Service.

### Legal & Risk Notice:

**WE PROVIDE THE TOOL. THE USER ASSUMES ALL RISK.**

1. **Platform ToS Violations**
   - Features like bulk scraping, engagement farming, mass messaging MAY violate Facebook/Instagram/LinkedIn ToS
   - Users risk account suspension or permanent ban
   - **USAMKO is not liable for account bans**

2. **Legal Compliance**
   - Features comply with SOFTWARE laws (we're not breaking into systems)
   - Users must comply with DATA PROTECTION laws (GDPR, CCPA)
   - Users must obtain consent for messaging (CAN-SPAM Act)
   - **USAMKO is not liable for users' illegal data collection**

3. **How We Mitigate Risk**
   - ✅ **Browser Automation** (not server scraping) - User runs automation in THEIR browser
   - ✅ **User's Accounts** - We never touch user credentials on our servers
   - ✅ **Configurable Rate Limits** - Users can set conservative limits
   - ✅ **Human Simulation** - Mouse movements, typing delays, reading time
   - ✅ **Anti-Detection** - Fingerprinting, proxies, residential IPs
   - ✅ **Clear Warnings** - Every aggressive feature has risk warning in UI

4. **Terms of Service (Our ToS)**
   ```
   By using USAMKO aggressive features, you agree:
   - You are responsible for compliance with platform ToS
   - You accept all risk of account suspension/bans
   - You will not hold USAMKO liable for any consequences
   - You will use features legally and ethically
   - You will obtain user consent for messaging/data collection
   ```

---

## Architecture: How Aggressive Features Work

### Existing Sender Pro Approach (We Keep This)

**Technology:** Playwright + Selenium (Browser Automation)

```
User's Computer
   ↓
USAMKO Desktop App
   ↓
Playwright/Selenium
   ↓
Real Browser (Chrome/Firefox)
   ↓
User's Session (Their Cookies, Their IP)
   ↓
Facebook/Instagram/etc. (Sees REAL USER, not a bot)
```

**Why This Works:**
- Platforms see a REAL browser (not API scraping)
- User's own cookies/session (logged in as themselves)
- Human simulation (mouse, typing, delays)
- Harder to detect than API abuse

**Why It's Still Risky:**
- Platform algorithms detect PATTERNS (too fast, too repetitive)
- Users can still get flagged for spam behavior
- But it's MUCH safer than server-side scraping

### v2.0 Improvements

We keep the same approach but ADD:

1. **Better Anti-Detection**
   - Canvas fingerprinting (unique per session)
   - WebGL fingerprinting
   - Audio context fingerprinting
   - TLS fingerprint matching
   - Residential proxy support

2. **Human Simulation Engine**
   - Bezier curves for mouse movement
   - Variable typing speed (50-150ms per char)
   - Random reading time (scroll, pause, read)
   - Realistic delays between actions (1-5 seconds)

3. **Smart Rate Limiting**
   - AI-powered: Learns safe limits per platform
   - User configurable: Conservative/Moderate/Aggressive modes
   - Auto-slowdown on detection: If action fails, wait longer

4. **Session Management**
   - Warm-up period: Browse normally before automation
   - Cool-down period: Browse normally after automation
   - Session rotation: Switch accounts/proxies periodically

---

## Complete Feature List (200+ Features from Sender Pro)

### Category 1: Data Extraction (Browser Automation)

All extraction features use **browser automation** (user's browser, user's session):

#### Facebook Extraction

| Feature | How It Works | Risk | Mitigation |
|---------|-------------|------|------------|
| **Engagement Extractor** | Browser loads post, scrolls to load all likes, extracts names | Medium | Rate limit: 1 scroll/3s, max 1000 users |
| **Share Extractor** | Browser clicks "Shares" tab, extracts list | Medium | Rate limit: 1 request/5s |
| **Comment Extractor** | Browser scrolls comments, extracts text+users | Medium | Rate limit: 1 scroll/2s, max 500 comments |
| **Reels Comment Extractor** | Same as above for Reels | Medium | Limit: 100 comments/Reel |
| **Phone Number Extractor** | Parse comments for phone patterns | ⚠️ HIGH | User must have consent, GDPR compliance required |
| **Demographics Extractor** | Click profiles, extract public bio data | High | Limit: 10 profiles/minute, require explicit user opt-in |
| **Friends Extractor** | Navigate to friends page, extract list | Medium | Facebook limits: Your friends only |
| **Message Extractor** | Access Messages tab, extract senders | Low | Legitimate use (your own messages) |
| **Group Member Extractor** | Navigate to group members, extract list | High | Limit: 100 members/5min, public groups only |
| **Page Data Extractor** | Visit page, extract public info | Low | Public data, OK if rate limited |
| **Follower Extractor** | Navigate to followers, extract list | High | Your page only, limit: 100/5min |
| **Review Extractor** | Navigate to reviews, extract reviewers | Low | Public data |
| **Joined Groups Extractor** | Navigate to your groups, extract list | Low | Your own data |

**Implementation:**
```typescript
// Example: Comment Extractor
async function extractComments(postUrl: string, maxComments: number = 500): Promise<Comment[]> {
  const browser = await launchBrowser(userProfile);
  const page = await browser.newPage();
  
  await page.goto(postUrl);
  await humanDelay(2000, 4000); // Random 2-4s delay
  
  const comments: Comment[] = [];
  let scrollCount = 0;
  const maxScrolls = Math.ceil(maxComments / 20); // ~20 comments per scroll
  
  while (scrollCount < maxScrolls) {
    // Scroll to load more comments
    await page.evaluate(() => window.scrollBy(0, 500));
    await humanDelay(2000, 3000); // Wait for load
    
    // Extract visible comments
    const newComments = await page.$$eval('.comment', (elements) =>
      elements.map(el => ({
        user: el.querySelector('.author')?.textContent,
        text: el.querySelector('.text')?.textContent,
        timestamp: el.querySelector('.timestamp')?.textContent,
      }))
    );
    
    comments.push(...newComments);
    scrollCount++;
    
    // Anti-detection: Random pause every 5 scrolls
    if (scrollCount % 5 === 0) {
      await humanDelay(10000, 15000); // 10-15s break
    }
  }
  
  await browser.close();
  return comments.slice(0, maxComments);
}
```

#### Instagram Extraction

| Feature | How It Works | Risk | Mitigation |
|---------|-------------|------|------------|
| **Follower Extractor** | Navigate to followers, scroll, extract | High | Limit: 500/session, 3s/scroll |
| **Comment Extractor** | Scroll post comments, extract | Medium | Limit: 200/post |
| **AI Comment Extractor** | Same + AI filters relevant | Medium | Same limits |
| **Message Extractor** | Access DMs, extract senders | Low | Your own DMs |
| **Location Extractor** | Search location, extract posts | Medium | Limit: 50 posts/search |
| **Hashtag Extractor** | Search hashtag, extract posts | Low | Public data, limit: 50/search |
| **Page Post Extractor** | Visit profile, extract posts | Low | Public data |

#### WhatsApp Extraction

| Feature | How It Works | Risk | Mitigation |
|---------|-------------|------|------------|
| **WhatsApp Filter** | Check if phone has WhatsApp | Low | Use WhatsApp Business API |
| **Contact Filter** | Check contacts against WhatsApp | Low | Legitimate use |
| **Group Link Extractor** | Parse group invite link, extract members | Medium | Public groups only |
| **Joined Group Extractor** | Navigate to your groups, extract members | Medium | Your groups only |
| **Chat Extractor** | Access chats, extract contacts | Low | Your own chats |
| **Archive Extractor** | Access archived chats | Low | Your own data |

#### Other Platforms (Twitter, LinkedIn, Telegram, TikTok, etc.)

All follow same pattern:
- Browser automation (user's browser)
- Rate-limited scrolling/clicking
- Human simulation delays
- Extract only public or user-owned data

---

### Category 2: Automation & Posting

#### Facebook Automation

| Feature | How It Works | Risk | Mitigation |
|---------|-------------|------|------------|
| **Personal Auto-Poster** | Post to groups via browser | Medium | Limit: 10 posts/hour, 1 group/2min |
| **Page Auto-Poster** | Post to groups as page | Medium | Same limits |
| **Bulk Page Auto-Poster** | Post from multiple pages | High | Limit: 5 pages max, 20min delay between pages |
| **Auto-Reply** | Monitor post, auto-reply to comments | Medium | Limit: 1 reply/30s, max 50/day |
| **Post Sharer** | Share post to groups | Medium | Limit: 10 shares/hour |
| **Sales Post Tool** | Post as "Sell Something" | Low | Facebook native feature |
| **Marketplace Sharer** | Share Marketplace items | Low | Facebook native feature |
| **Auto-Poster** | Schedule posts | Low | Legitimate scheduling |
| **Page Reviewer** | Leave reviews | Low | Legitimate if genuine reviews |
| **Promotional Messenger** | Send messages to pages | ⚠️ HIGH | Requires opt-in, limit: 10/hour |
| **Customer Messenger** | Send messages to users | ⚠️ HIGH | Requires opt-in, limit: 20/day |
| **Retargeting Tool** | Message previous customers | Medium | Requires previous consent |
| **ID Messenger** | Message by user ID | ⚠️ HIGH | Same as Customer Messenger |
| **Group Chat Adder** | Add users to group chat | High | Requires invitation acceptance |
| **Comment Tagger** | Tag users in comments | Medium | Limit: 5 tags/comment, 20 comments/hour |
| **Post Tagger** | Tag users in posts | Medium | Limit: 10 tags/post, 5 posts/day |
| **Action Automation** | Join groups, like pages | Low | Limit: 20 actions/hour |
| **Friend Request Tool** | Send friend requests | Medium | Facebook limit: 20/day |
| **Friend Remover** | Remove all friends | Low | Your own friends |
| **Engagement Farm** | ⚠️ Auto-like/comment | ⚠️ VERY HIGH | **Requires explicit user opt-in + warning** |
| **Page Commenter** | Comment on page posts | Medium | Limit: 10 comments/hour, genuine comments only |
| **Post Deleter** | Delete own posts | Low | Your own posts |
| **Like Inviter** | Invite users to like page | Medium | Facebook limit: 500/day |
| **Group Inviter** | Invite friends to group | Medium | Limit: 50 invites/day |

**Implementation:**
```typescript
// Example: Auto-Poster with Human Simulation
async function autoPost(content: PostContent, groups: string[]): Promise<void> {
  const browser = await launchBrowser(userProfile);
  const page = await browser.newPage();
  
  for (const groupUrl of groups) {
    // Navigate to group
    await page.goto(groupUrl);
    await humanDelay(3000, 5000); // Look around (3-5s)
    
    // Scroll a bit (human behavior)
    await page.evaluate(() => window.scrollBy(0, Math.random() * 500));
    await humanDelay(1000, 2000);
    
    // Click post box
    await humanClick(page, '[aria-label="Write something"]');
    await humanDelay(500, 1000);
    
    // Type with human speed
    await humanType(page, content.text);
    await humanDelay(2000, 4000); // Think before posting
    
    // Upload images if any
    if (content.images) {
      await page.click('[aria-label="Photo/Video"]');
      await humanDelay(1000, 2000);
      
      for (const imagePath of content.images) {
        await page.setInputFiles('input[type="file"]', imagePath);
        await humanDelay(2000, 3000);
      }
    }
    
    // Post
    await humanClick(page, '[aria-label="Post"]');
    await humanDelay(2000, 4000);
    
    // IMPORTANT: Delay between groups (2-5 minutes)
    await humanDelay(120000, 300000);
  }
  
  await browser.close();
}

// Human simulation functions
async function humanClick(page: Page, selector: string) {
  const element = await page.$(selector);
  const box = await element.boundingBox();
  
  // Move mouse in bezier curve
  await moveMouseHuman(page, box.x + box.width/2, box.y + box.height/2);
  await humanDelay(100, 300); // Pause before click
  await element.click();
}

async function humanType(page: Page, text: string) {
  for (const char of text) {
    await page.keyboard.type(char);
    await humanDelay(50, 150); // Variable typing speed
  }
}

async function humanDelay(min: number, max: number) {
  const delay = Math.random() * (max - min) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

#### Other Platform Automation

All platforms follow same pattern:
- Browser automation
- Human simulation
- Rate limiting
- Configurable delays

---

### Category 3: Engagement Farming (⚠️ HIGHEST RISK)

**Warning:** These features have the HIGHEST ban risk. Implement with:
- ✅ Explicit user consent (checkbox: "I understand the risk of using engagement farming")
- ✅ Conservative default limits (10 actions/hour)
- ✅ Prominent warning in UI
- ✅ Auto-disable after first flag/warning from platform

| Feature | How It Works | Default Limit | Max Limit (User Override) |
|---------|-------------|---------------|---------------------------|
| **Facebook Engagement Farm** | Auto-like posts from feed | 10/hour | 50/hour |
| **Instagram Engagement Farm** | Auto-like posts from hashtag | 10/hour | 30/hour |
| **Twitter Engagement Farm** | Auto-like/retweet from feed | 20/hour | 100/hour |
| **LinkedIn Engagement Farm** | Auto-like posts from feed | 5/hour | 20/hour |
| **TikTok Engagement Farm** | Auto-like videos from For You page | 20/hour | 50/hour |

**Implementation:**
```typescript
// Engagement Farm with Safety Features
async function engagementFarm(config: EngagementConfig): Promise<void> {
  // SAFETY CHECK: Require explicit consent
  if (!config.userConsentGiven) {
    throw new Error('User must explicitly consent to engagement farming');
  }
  
  // SAFETY CHECK: Enforce limits
  const hourlyLimit = Math.min(config.limit, config.platform === 'facebook' ? 50 : 100);
  
  const browser = await launchBrowser(userProfile);
  const page = await browser.newPage();
  
  let actionsCount = 0;
  let flaggedCount = 0;
  
  while (actionsCount < hourlyLimit) {
    // Navigate to feed
    await page.goto(config.feedUrl);
    await humanDelay(3000, 6000);
    
    // Scroll to load posts
    await page.evaluate(() => window.scrollBy(0, 500));
    await humanDelay(2000, 4000);
    
    // Find like buttons
    const likeButtons = await page.$$('[aria-label="Like"]');
    
    for (const button of likeButtons.slice(0, 5)) { // Max 5 per scroll
      try {
        await humanClick(page, button);
        actionsCount++;
        
        // Random delay (30s-2min between likes)
        await humanDelay(30000, 120000);
        
        // SAFETY: Check for platform warnings
        const hasWarning = await page.$('[data-testid="platform-warning"]');
        if (hasWarning) {
          flaggedCount++;
          
          if (flaggedCount >= 2) {
            // Stop immediately if flagged twice
            console.error('Platform flagged activity. Stopping engagement farm.');
            await browser.close();
            return;
          }
          
          // First flag: Wait 1 hour
          console.warn('Platform flag detected. Pausing for 1 hour.');
          await humanDelay(3600000, 3600000);
        }
        
      } catch (error) {
        // Like button not found or action blocked
        break;
      }
    }
  }
  
  await browser.close();
}
```

---

### Category 4: B2B Data Extraction (28 Tools)

All B2B extraction tools use browser automation:

| Tool | Platform | How It Works | Risk |
|------|----------|-------------|------|
| **Google Maps Extractor** | Google Maps | Search → Scrape results | Medium (respects rate limits) |
| **OLX Extractor** | OLX.com | Search category → Extract listings | Low (public data) |
| **Property Finder** | PropertyFinder.ae | Search → Extract properties | Low (public data) |
| **Yellow Pages** | YellowPages | Search → Extract businesses | Low (public data) |
| **Haraj Extractor** | Haraj.com.sa | Search → Extract listings | Low (public data) |
| **OpenSooq** | OpenSooq.com | Search → Extract listings | Low (public data) |
| ... (all 28 tools follow same pattern) |

**Implementation:**
```typescript
// Generic B2B Extractor
async function extractB2BData(config: B2BExtractorConfig): Promise<Business[]> {
  const browser = await launchBrowser(userProfile);
  const page = await browser.newPage();
  
  await page.goto(config.searchUrl);
  await humanDelay(2000, 4000);
  
  // Respect robots.txt
  const robotsTxt = await fetch(`${config.baseUrl}/robots.txt`).then(r => r.text());
  if (robotsTxt.includes(`Disallow: ${config.searchPath}`)) {
    throw new Error('robots.txt disallows this path');
  }
  
  const businesses: Business[] = [];
  let pageNum = 1;
  
  while (pageNum <= config.maxPages) {
    // Extract listings from current page
    const listings = await page.$$eval(config.listingSelector, (elements) =>
      elements.map(el => ({
        name: el.querySelector(config.nameSelector)?.textContent,
        phone: el.querySelector(config.phoneSelector)?.textContent,
        address: el.querySelector(config.addressSelector)?.textContent,
        website: el.querySelector(config.websiteSelector)?.href,
      }))
    );
    
    businesses.push(...listings);
    
    // Navigate to next page
    const nextButton = await page.$(config.nextButtonSelector);
    if (!nextButton) break;
    
    await humanClick(page, nextButton);
    await humanDelay(3000, 6000); // Delay between pages
    
    pageNum++;
  }
  
  await browser.close();
  return businesses;
}
```

---

## Implementation Priority

### Phase 1 (Months 1-4): Core + Safe Features
- ✅ All posting/scheduling features (low risk)
- ✅ Data extraction with conservative limits
- ✅ Basic automation (join groups, like pages)

### Phase 2 (Months 5-7): Moderate Risk Features
- ⚠️ Messaging features (with opt-in requirements)
- ⚠️ Friend requests, follows (with limits)
- ⚠️ B2B extractors (with rate limiting)

### Phase 3 (Months 8-12): High Risk Features
- ⚠️⚠️ Engagement farming (with explicit warnings)
- ⚠️⚠️ Bulk messaging (with CAN-SPAM compliance)
- ⚠️⚠️ Aggressive automation (with safety checks)

---

## User Interface: Risk Warnings

Every aggressive feature has UI warnings:

```typescript
// Example: Engagement Farm Warning Modal
<WarningModal
  title="⚠️ Engagement Farm - HIGH RISK"
  severity="high"
  feature="engagement-farm"
>
  <p><strong>WARNING:</strong> This feature may violate platform Terms of Service.</p>
  
  <ul>
    <li>❌ Your account may be suspended or permanently banned</li>
    <li>❌ Platforms detect automated behavior patterns</li>
    <li>❌ USAMKO is not liable for account bans</li>
  </ul>
  
  <p><strong>Use this feature at your own risk.</strong></p>
  
  <Checkbox required>
    I understand the risks and accept full responsibility
  </Checkbox>
  
  <RateLimitSelector
    default={10}
    max={50}
    warning="Higher limits = higher ban risk"
  />
  
  <Button type="danger">
    I Accept the Risk - Enable Feature
  </Button>
</WarningModal>
```

---

## Legal Protection (Terms of Service)

**USAMKO Terms of Service** (excerpt):

```markdown
## 8. Aggressive Automation Features

8.1 USAMKO provides automation tools that may violate third-party platform Terms of Service.

8.2 By using these features, you acknowledge and agree that:
   a) You are solely responsible for compliance with platform ToS
   b) You accept all risk of account suspension, bans, or legal action
   c) USAMKO is not liable for any consequences resulting from your use
   d) You will not hold USAMKO liable for account bans, data loss, or legal issues

8.3 Data Collection Compliance:
   a) You must comply with GDPR, CCPA, and other data protection laws
   b) You must obtain explicit consent before collecting personal data
   c) You must obtain explicit consent before sending marketing messages
   d) USAMKO is not liable for your data protection law violations

8.4 Browser Automation:
   a) All automation runs on YOUR computer, using YOUR accounts
   b) USAMKO does not access, store, or control your accounts
   c) You are using browser automation tools at your own discretion

8.5 Disclaimer:
   USAMKO PROVIDES TOOLS "AS IS" WITHOUT WARRANTY OF ANY KIND. 
   USE AT YOUR OWN RISK.
```

---

## Conclusion

**Decision: We implement ALL 200+ features from Sender Pro with:**

1. ✅ **Browser Automation** (not server scraping) - User's browser, user's accounts
2. ✅ **Human Simulation** - Mouse, typing, delays, bezier curves
3. ✅ **Anti-Detection** - Fingerprinting, proxies, residential IPs
4. ✅ **Configurable Rate Limits** - Conservative defaults, user can override
5. ✅ **Safety Checks** - Auto-stop on platform warnings
6. ✅ **Clear Warnings** - Every risky feature has UI warning
7. ✅ **Legal Protection** - ToS disclaims liability
8. ✅ **User Responsibility** - User accepts all risk

**This approach:**
- ✅ Gives users the power they want (all features)
- ✅ Protects USAMKO legally (disclaimer + browser automation)
- ✅ Is technically superior to competitors (anti-detection, human simulation)
- ⚠️ Still carries risk for users (but they're informed and accept it)

**Next Steps:**
1. Update Master Specification with these features
2. Create detailed implementation tickets
3. Build UI warning system
4. Draft legal ToS with lawyer review
5. Start Phase 1 development

---

**Document Version:** 1.0  
**Author:** USAMKO Architecture Team  
**Date:** July 27, 2026  
**Status:** APPROVED - Proceed with implementation
