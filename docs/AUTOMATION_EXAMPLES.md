# 🤖 Browser Automation - Real-World Examples

## Example 1: Facebook Auto-Login & Post

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:3000';
const TOKEN = 'your-jwt-token';

async function facebookAutoPost() {
  // Create browser session
  const { data: { sessionId } } = await axios.post(
    `${API_URL}/automation/sessions`,
    { headless: false },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  try {
    // Navigate to Facebook
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/navigate`,
      { url: 'https://facebook.com' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    // Wait for page load
    await sleep(2000);

    // Fill login form with human behavior
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/fill-form`,
      {
        fields: [
          { selector: '#email', value: 'your.email@example.com' },
          { selector: '#pass', value: 'YourPassword123' }
        ]
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    // Click login button
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/human-click`,
      { selector: 'button[name="login"]' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    // Wait for login
    await sleep(5000);

    // Save cookies for future use
    const { data: { cookies } } = await axios.get(
      `${API_URL}/automation/sessions/${sessionId}/cookies`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
    console.log('Cookies saved:', cookies.length);

    // Navigate to create post
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/navigate`,
      { url: 'https://facebook.com' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    await sleep(2000);

    // Click "What's on your mind?"
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/human-click`,
      { selector: '[aria-label="Create a post"]' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    await sleep(1000);

    // Type post content
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/human-type`,
      {
        selector: '[aria-label="What\'s on your mind?"]',
        text: 'Hello from USAMKO automation! 🚀',
        minDelay: 80,
        maxDelay: 180
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    await sleep(1000);

    // Click Post button
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/human-click`,
      { selector: '[aria-label="Post"]' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log('✅ Post published successfully!');

  } finally {
    // Always close session
    await axios.delete(
      `${API_URL}/automation/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

facebookAutoPost().catch(console.error);
```

---

## Example 2: Instagram Bulk Follow

```typescript
async function instagramBulkFollow(usernames: string[]) {
  const { data: { sessionId } } = await axios.post(
    `${API_URL}/automation/sessions`,
    { 
      headless: true,
      proxy: {
        server: 'http://proxy.example.com:8080',
        username: 'proxyuser',
        password: 'proxypass'
      }
    },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  try {
    // Set saved cookies (from previous login)
    const savedCookies = loadCookiesFromDatabase();
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/cookies`,
      { cookies: savedCookies },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    for (const username of usernames) {
      // Navigate to user profile
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/navigate`,
        { url: `https://instagram.com/${username}/` },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(randomInt(2000, 4000));

      // Simulate reading profile
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/simulate-reading`,
        { duration: randomInt(3000, 6000) },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      // Click Follow button
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: 'button:has-text("Follow")' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      console.log(`✅ Followed ${username}`);

      // Random delay between follows (30-90 seconds)
      await sleep(randomInt(30000, 90000));
    }

  } finally {
    await axios.delete(
      `${API_URL}/automation/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
```

---

## Example 3: LinkedIn Connection Requests

```typescript
async function linkedInBulkConnect(profileUrls: string[], message: string) {
  const { data: { sessionId } } = await axios.post(
    `${API_URL}/automation/sessions`,
    { headless: false },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  try {
    // Set LinkedIn cookies
    const linkedInCookies = loadLinkedInCookies();
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/cookies`,
      { cookies: linkedInCookies },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    for (const profileUrl of profileUrls) {
      // Navigate to profile
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/navigate`,
        { url: profileUrl },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(randomInt(3000, 5000));

      // Click "Connect" button
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: 'button:has-text("Connect")' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Click "Add a note"
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: 'button:has-text("Add a note")' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(500);

      // Type personalized message
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-type`,
        {
          selector: 'textarea[name="message"]',
          text: message,
          minDelay: 70,
          maxDelay: 140
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Click Send
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: 'button:has-text("Send")' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      console.log(`✅ Connection request sent to ${profileUrl}`);

      // Delay between requests (60-120 seconds)
      await sleep(randomInt(60000, 120000));
    }

  } finally {
    await axios.delete(
      `${API_URL}/automation/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  }
}
```

---

## Example 4: Twitter Auto-Reply Bot

```typescript
async function twitterAutoReply(keyword: string, reply: string) {
  const { data: { sessionId } } = await axios.post(
    `${API_URL}/automation/sessions`,
    { headless: true },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  try {
    // Set Twitter cookies
    const twitterCookies = loadTwitterCookies();
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/cookies`,
      { cookies: twitterCookies },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    // Search for keyword
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/navigate`,
      { url: `https://twitter.com/search?q=${encodeURIComponent(keyword)}&f=live` },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    await sleep(3000);

    // Get tweet URLs
    const { data: { result: tweetUrls } } = await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/execute`,
      {
        script: `
          Array.from(document.querySelectorAll('article a[href*="/status/"]'))
            .slice(0, 10)
            .map(a => a.href)
        `
      },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    for (const tweetUrl of tweetUrls) {
      // Navigate to tweet
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/navigate`,
        { url: tweetUrl },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(2000);

      // Click reply button
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: '[data-testid="reply"]' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Type reply
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-type`,
        {
          selector: '[data-testid="tweetTextarea_0"]',
          text: reply,
          minDelay: 60,
          maxDelay: 120
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Click Tweet button
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: '[data-testid="tweetButton"]' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      console.log(`✅ Replied to ${tweetUrl}`);

      // Delay between replies (120-240 seconds)
      await sleep(randomInt(120000, 240000));
    }

  } finally {
    await axios.delete(
      `${API_URL}/automation/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  }
}
```

---

## Example 5: WhatsApp Bulk Messaging

```typescript
async function whatsappBulkMessage(contacts: Array<{ name: string, phone: string }>, message: string) {
  const { data: { sessionId } } = await axios.post(
    `${API_URL}/automation/sessions`,
    { headless: false },
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );

  try {
    // Navigate to WhatsApp Web
    await axios.post(
      `${API_URL}/automation/sessions/${sessionId}/navigate`,
      { url: 'https://web.whatsapp.com' },
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );

    console.log('⏳ Please scan QR code to login...');
    await sleep(30000); // Wait for user to scan QR

    for (const contact of contacts) {
      // Click search box
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: '[data-testid="chat-list-search"]' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(500);

      // Type contact name
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-type`,
        {
          selector: '[data-testid="chat-list-search"]',
          text: contact.name,
          minDelay: 80,
          maxDelay: 150
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(2000);

      // Click first result
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: '[data-testid="cell-frame-container"]:first-child' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Type message
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-type`,
        {
          selector: '[data-testid="conversation-compose-box-input"]',
          text: message,
          minDelay: 70,
          maxDelay: 130
        },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      await sleep(1000);

      // Send message
      await axios.post(
        `${API_URL}/automation/sessions/${sessionId}/human-click`,
        { selector: '[data-testid="compose-btn-send"]' },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );

      console.log(`✅ Message sent to ${contact.name}`);

      // Delay between messages (30-60 seconds)
      await sleep(randomInt(30000, 60000));
    }

  } finally {
    await axios.delete(
      `${API_URL}/automation/sessions/${sessionId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } }
    );
  }
}
```

---

## 🎯 Best Practices

### 1. Always Use Random Delays
```typescript
// ❌ BAD: Same delay every time
await sleep(5000);

// ✅ GOOD: Random delays
await sleep(randomInt(4000, 7000));
```

### 2. Simulate Human Reading
```typescript
// ❌ BAD: Instant action
await clickButton();

// ✅ GOOD: Read first, then act
await simulateReading(5000);
await clickButton();
```

### 3. Use Proxies for Bulk Operations
```typescript
// ✅ GOOD: Different proxy per session
const proxy = getNextProxy();
const { sessionId } = await createSession({ proxy });
```

### 4. Save Cookies to Avoid Re-Login
```typescript
// ✅ GOOD: Login once, reuse cookies
const cookies = await getCookies(sessionId);
saveCookiesToDatabase(cookies);

// Next time:
const savedCookies = loadCookiesFromDatabase();
await setCookies(sessionId, savedCookies);
```

### 5. Handle Errors Gracefully
```typescript
try {
  await performAction(sessionId);
} catch (error) {
  console.error('Action failed:', error);
  // Take screenshot for debugging
  const screenshot = await getScreenshot(sessionId);
  saveScreenshot(screenshot);
} finally {
  // Always close session
  await closeSession(sessionId);
}
```

---

## ⚠️ Rate Limits & Safety

| Platform | Safe Rate | Max Daily | Recommendation |
|----------|-----------|-----------|----------------|
| Facebook | 20-30/hour | 200 actions | 30-90s delays |
| Instagram | 10-15/hour | 150 actions | 60-120s delays |
| LinkedIn | 5-10/hour | 100 actions | 120-240s delays |
| Twitter | 15-20/hour | 200 actions | 60-120s delays |
| WhatsApp | 30-50/hour | 500 messages | 30-60s delays |

**Golden Rules:**
- Never exceed 50 actions/hour
- Always add random delays (30-120 seconds)
- Use different proxies for different accounts
- Simulate human behavior (reading, scrolling)
- Monitor for CAPTCHA challenges

---

**Created:** August 1, 2026  
**Version:** v2.0  
**Status:** Production Ready ✅
