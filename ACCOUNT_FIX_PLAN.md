# URGENT: Multi-User Account Connection Fix

## Current State Analysis

### ✅ What Already Works
- **Database**: Proper multi-tenant isolation (`tenantId` + `userId` in PlatformAccount)
- **Security**: JWT + Tenant + Role guards on all APIs
- **APIs**: Full CRUD for platform accounts (`GET/POST/PATCH/DELETE /platforms`)
- **UI**: Platform management page at `/platforms`
- **Extension**: WebSocket connection working, content scripts deployed
- **Encryption**: Tokens/cookies encrypted at rest
- **Authenticated Scraping**: LinkedInAuthenticatedService uses stored credentials

### ❌ What's Broken
1. **Extension capture untested** - You haven't visited LinkedIn to test auto-capture
2. **No test connection** - Can't verify if stored credentials still work
3. **No account selector** - Lead collection uses first available account
4. **Extension-only** - No alternative connection methods
5. **No per-platform auth strategy** - Haven't researched best method per platform

---

## Fix Plan (Don't Rebuild - Improve)

### Phase 1: Test Current System (30 min)
**Goal**: Verify existing implementation works

```bash
# Steps:
1. Open Chrome with extension connected
2. Visit https://www.linkedin.com (logged in)
3. Wait 5 seconds
4. Check extension popup - "Connected Accounts" should show 1
5. Check database:
   SELECT * FROM "PlatformAccount" WHERE platform = 'LINKEDIN';
6. Go to usamko.usamif.com/platforms - verify account appears
7. Run lead collection - check server logs for "Using authenticated LinkedIn account"
```

**Expected**:
- LinkedIn cookies captured automatically
- Account shows CONNECTED status
- Lead collection uses authenticated scraping

**If it works**: Current system is fine, just needs UI improvements
**If it fails**: Debug content script timing/cookie detection

---

### Phase 2: Add Test Connection (2 hours)

**Backend**:
```typescript
// apps/api/src/platforms/platform.controller.ts
@Post(':id/verify')
async verifyConnection(@Param('id') id: string) {
  return this.platformService.verifyConnection(id);
}

// apps/api/src/platforms/platform.service.ts
async verifyConnection(accountId: string) {
  const account = await this.prisma.platformAccount.findUnique({
    where: { id: accountId },
  });
  
  // Platform-specific verification
  switch (account.platform) {
    case 'LINKEDIN':
      return this.verifyLinkedIn(account);
    case 'FACEBOOK':
      return this.verifyFacebook(account);
    // ...
  }
}

private async verifyLinkedIn(account) {
  // Try to access LinkedIn profile with stored cookies
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Apply cookies
  const cookies = JSON.parse(account.cookies);
  await context.addCookies([
    { name: 'li_at', value: cookies.li_at, domain: '.linkedin.com', path: '/' },
  ]);
  
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/feed/');
  
  // Check if redirected to login (means cookies expired)
  const url = page.url();
  const isValid = !url.includes('/login');
  
  await browser.close();
  
  // Update status
  await this.prisma.platformAccount.update({
    where: { id: account.id },
    data: { 
      status: isValid ? 'CONNECTED' : 'DISCONNECTED',
      metadata: { lastVerified: new Date(), verificationResult: isValid },
    },
  });
  
  return { valid: isValid, lastVerified: new Date() };
}
```

**Frontend**:
```typescript
// apps/web/src/app/(dashboard)/platforms/page.tsx
const handleTestConnection = async (id: string) => {
  setTesting(id);
  try {
    const result = await api.verifyPlatform(id);
    alert(result.valid ? '✓ Connection works!' : '✗ Connection expired - reconnect');
    loadPlatforms();
  } finally {
    setTesting(null);
  }
};

// Add button:
<button
  onClick={() => handleTestConnection(platform.id)}
  disabled={testing === platform.id}
  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded"
>
  {testing === platform.id ? 'Testing...' : 'Test'}
</button>
```

---

### Phase 3: Account Selector (3 hours)

**Lead Collection UI**:
```typescript
// apps/web/src/app/(dashboard)/leads/collect/page.tsx
const [accounts, setAccounts] = useState([]);
const [selectedAccount, setSelectedAccount] = useState('');

useEffect(() => {
  // Load available LinkedIn accounts
  api.getPlatforms().then(data => {
    const linkedin = data.filter(p => p.platform === 'LINKEDIN' && p.status === 'CONNECTED');
    setAccounts(linkedin);
    if (linkedin.length) setSelectedAccount(linkedin[0].id);
  });
}, []);

// Add to form:
<div>
  <label>LinkedIn Account</label>
  <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
    {accounts.map(acc => (
      <option key={acc.id} value={acc.id}>{acc.accountName || acc.username}</option>
    ))}
  </select>
  {accounts.length === 0 && (
    <p className="text-red-500 text-sm">
      No LinkedIn accounts connected. 
      <Link href="/platforms">Connect one →</Link>
    </p>
  )}
</div>

// Pass to API:
await api.collectLeads({
  ...formData,
  accountId: selectedAccount, // NEW
});
```

**Backend**:
```typescript
// apps/api/src/leads/leads.service.ts
private async collectFromLinkedIn(tenantId: string, params: CollectLeadsDto) {
  const userId = params.userId; // From request
  const accountId = params.accountId; // NEW - passed from UI
  
  if (params.company) {
    return await this.linkedInAuth.searchPeopleAtCompany({
      tenantId,
      userId,
      accountId, // NEW - use specific account instead of default
      companyUrl: params.company,
      role: params.role,
      maxResults: params.maxResults || 100,
    });
  }
  // ...
}

// apps/api/src/leads/workers/linkedin-authenticated.service.ts
async searchPeopleAtCompany(params: {
  tenantId: string;
  userId: string;
  accountId?: string; // NEW
  companyUrl: string;
  role?: string;
  maxResults: number;
}) {
  // Get specific account if provided, otherwise default
  const account = params.accountId
    ? await this.scrapingAccountsService.getAccount(params.accountId, params.tenantId)
    : await this.scrapingAccountsService.getDefaultAccount(params.tenantId, params.userId, 'linkedin');
    
  if (!account) {
    throw new Error('No LinkedIn account available');
  }
  
  // Use the selected account...
}
```

---

### Phase 4: Platform Auth Research

#### LinkedIn
**Official APIs**: ❌ None for scraping/lead collection
**OAuth**: ✅ Exists but only for profile/basic info, not search
**Best Method**: Cookie-based via extension (current approach is correct)
**Backup**: Manual cookie paste
**Limitations**: No way around LinkedIn's anti-scraping measures

#### Facebook
**Official APIs**: ✅ Graph API with OAuth
**OAuth Scopes**: `pages_read_engagement`, `pages_manage_posts`, `business_management`
**Best Method**: OAuth flow
**Implementation**:
```typescript
// Redirect to Facebook OAuth
window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?` +
  `client_id=${FB_APP_ID}&` +
  `redirect_uri=${CALLBACK_URL}&` +
  `scope=pages_read_engagement,pages_manage_posts&` +
  `state=${userId}`;
  
// Callback handler
@Get('auth/facebook/callback')
async facebookCallback(@Query('code') code: string, @Query('state') userId: string) {
  // Exchange code for token
  const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
    `client_id=${FB_APP_ID}&` +
    `client_secret=${FB_APP_SECRET}&` +
    `redirect_uri=${CALLBACK_URL}&` +
    `code=${code}`);
    
  const { access_token } = await tokenResponse.json();
  
  // Get user info
  const profileResponse = await fetch(`https://graph.facebook.com/me?access_token=${access_token}`);
  const profile = await profileResponse.json();
  
  // Store in PlatformAccount
  await this.platformService.createAccount(
    user.tenantId,
    'FACEBOOK',
    profile.name,
    profile.name,
    `https://facebook.com/${profile.id}`,
    access_token,
    null, // No refresh token
    null // No cookies
  );
}
```

#### Instagram
**Official APIs**: ✅ Instagram Graph API (requires Facebook Business)
**OAuth**: Through Facebook
**Best Method**: OAuth via Facebook
**Limitations**: Requires Business or Creator account

#### Telegram
**Official APIs**: ✅ Bot API + OAuth
**Best Method**: Telegram Login Widget
**Implementation**:
```html
<script async src="https://telegram.org/js/telegram-widget.js?22" 
  data-telegram-login="YOUR_BOT_NAME" 
  data-size="large" 
  data-onauth="onTelegramAuth(user)" 
  data-request-access="write">
</script>
```

---

### Phase 5: Add Connection Methods UI

```typescript
// apps/web/src/app/(dashboard)/platforms/add/page.tsx
'use client';

export default function AddPlatformPage() {
  const [platform, setPlatform] = useState('');
  const [method, setMethod] = useState('');
  
  const methods = {
    LINKEDIN: ['extension', 'manual_cookies'],
    FACEBOOK: ['oauth', 'extension'],
    INSTAGRAM: ['oauth_facebook', 'extension'],
    TELEGRAM: ['oauth_widget', 'manual_token'],
  };
  
  const handleConnect = async () => {
    if (method === 'extension') {
      alert('Open the Chrome Extension and visit ' + platform + '.com while logged in');
    } else if (method === 'oauth') {
      // Redirect to OAuth
      window.location.href = `/api/auth/${platform}/authorize`;
    } else if (method === 'manual_cookies') {
      // Show manual entry form
      setShowManualForm(true);
    }
  };
  
  return (
    <div>
      <h1>Add Platform Account</h1>
      
      <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
        <option value="">Select Platform</option>
        <option value="LINKEDIN">LinkedIn</option>
        <option value="FACEBOOK">Facebook</option>
        <option value="INSTAGRAM">Instagram</option>
        <option value="TELEGRAM">Telegram</option>
      </select>
      
      {platform && (
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Select Connection Method</option>
          {methods[platform].map(m => (
            <option key={m} value={m}>{formatMethod(m)}</option>
          ))}
        </select>
      )}
      
      <button onClick={handleConnect} disabled={!platform || !method}>
        Connect
      </button>
    </div>
  );
}
```

---

## Testing Checklist

### Multi-User Isolation Test
```
1. User A logs in
2. User A connects LinkedIn Account A via extension
3. User A runs lead collection → verify uses Account A
4. User A logs out

5. User B logs in (different browser/incognito)
6. User B connects LinkedIn Account B via extension
7. User B runs lead collection → verify uses Account B
8. User B goes to /platforms → verify ONLY sees Account B (not Account A)

9. Database check:
   SELECT * FROM "PlatformAccount";
   → Should show 2 rows with different tenantId/userId

10. Try to hack:
    curl -H "Authorization: Bearer USER_B_TOKEN" \
      GET https://usamko.usamif.com/api/platforms/USER_A_ACCOUNT_ID
    → Should return 403 Forbidden
```

### Connection Method Test
```
LinkedIn:
- ✓ Extension auto-capture works
- ✓ Manual cookie paste works
- ✓ Test connection verifies validity
- ✓ Expired cookies detected and flagged

Facebook:
- ✓ OAuth flow redirects correctly
- ✓ Token stored after callback
- ✓ Can post to Facebook page
- ✓ Token refresh works

Instagram:
- ✓ OAuth through Facebook works
- ✓ Can fetch Instagram insights
- ✓ Business account detected

Telegram:
- ✓ Login widget authentication
- ✓ Can send messages via bot
```

---

## What NOT to Do

❌ **Don't rebuild the entire system** - Current architecture is sound
❌ **Don't remove the extension** - It works for LinkedIn, just needs improvement
❌ **Don't add shared credentials in .env** - Defeats multi-user design
❌ **Don't bypass security guards** - TenantGuard prevents cross-user access
❌ **Don't change database schema without migration** - Will break production
❌ **Don't fake OAuth** - Use real provider flows or document limitations
❌ **Don't delete working features** - Only add, don't subtract

---

## Success Criteria

✅ User A connects their LinkedIn → works with their credentials
✅ User B connects their LinkedIn → works with their credentials
✅ User A cannot access User B's accounts (verified by trying)
✅ Each platform has ≥2 connection methods documented
✅ All accounts show live verified/error status
✅ Lead collection lets user choose which account to use
✅ Extension + OAuth + Manual all functional
✅ Database audit confirms proper isolation
✅ Security review passed

---

## Immediate Next Step

**RIGHT NOW**: Visit https://www.linkedin.com while extension is connected. Wait 5 seconds. Check if extension popup shows "Connected Accounts: 1". If yes, the system works and we just need UI improvements. If no, debug the content script.
