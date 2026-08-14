# Phase 2: Chrome Extension with WebSocket Backend

**Status:** Planning Complete, Ready to Implement  
**Duration:** 1 week (Week 3)  
**Dependencies:** Phase 1 (Security Foundation) ✅

---

## 🎯 OBJECTIVES

Build a Chrome Extension that captures OAuth tokens from browser sessions and relays them to USAMKO backend via secure WebSocket connection.

**Core Features:**
1. ✅ Chrome Extension (Manifest V3)
2. ✅ WebSocket Gateway (NestJS)
3. ✅ JWT Authentication
4. ✅ Token Capture & Relay
5. ✅ Real-time Status Updates

---

## 📋 ARCHITECTURE

### High-Level Flow

```
User Browser (Facebook/Instagram)
         ↓
    [Login & Authorize]
         ↓
Chrome Extension (Content Script)
         ↓ (captures tokens)
Chrome Extension (Background Service Worker)
         ↓ (WebSocket)
WebSocket Gateway (NestJS)
         ↓ (validates JWT)
TokenCaptureService
         ↓ (encrypts & stores)
CredentialVault (Database)
```

### Components

**1. Chrome Extension**
- **Manifest V3** structure
- **Content Scripts**: Inject into Facebook/Instagram pages
- **Background Service Worker**: Persistent WebSocket connection
- **Popup UI**: Status, connection state, logs
- **Token Detection**: Intercept network requests, extract tokens

**2. WebSocket Gateway (Backend)**
- **NestJS WebSocket Gateway** (@nestjs/websockets)
- **JWT Authentication** (token in connection handshake)
- **Event Handlers**: `capture_token`, `get_status`, `disconnect`
- **Rate Limiting**: Max 100 tokens/minute per user
- **Encryption**: All tokens encrypted before storage

**3. Message Protocol**
```typescript
// Client → Server
{
  event: 'capture_token',
  data: {
    platform: 'facebook' | 'instagram' | 'linkedin',
    accountId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    metadata?: {...}
  }
}

// Server → Client
{
  event: 'token_saved',
  data: {
    success: true,
    accountId: string,
    platform: string,
    message: 'Token captured and encrypted'
  }
}
```

---

## 🗂️ FILE STRUCTURE

```
m:\USAMKO\
├── apps\api\src\
│   └── token-capture\
│       ├── token-capture.gateway.ts       # WebSocket gateway
│       ├── token-capture.service.ts       # Business logic
│       ├── token-capture.module.ts        # NestJS module
│       ├── dto\
│       │   ├── capture-token.dto.ts       # Token capture DTO
│       │   └── token-response.dto.ts      # Response DTO
│       └── guards\
│           └── ws-jwt-auth.guard.ts       # WebSocket JWT auth
│
└── chrome-extension\
    ├── manifest.json                      # Extension manifest
    ├── background\
    │   └── service-worker.js              # Background script (WebSocket)
    ├── content\
    │   ├── facebook.js                    # Facebook token capture
    │   ├── instagram.js                   # Instagram token capture
    │   └── linkedin.js                    # LinkedIn token capture
    ├── popup\
    │   ├── popup.html                     # Extension popup
    │   ├── popup.css                      # Popup styles
    │   └── popup.js                       # Popup logic
    ├── icons\
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    └── utils\
        ├── websocket.js                   # WebSocket client
        └── token-detector.js              # Token detection logic
```

---

## 🔧 IMPLEMENTATION PLAN

### Day 1-2: WebSocket Gateway (Backend)

**Files to Create:**
1. `apps/api/src/token-capture/token-capture.gateway.ts`
2. `apps/api/src/token-capture/token-capture.service.ts`
3. `apps/api/src/token-capture/token-capture.module.ts`
4. `apps/api/src/token-capture/dto/capture-token.dto.ts`
5. `apps/api/src/token-capture/guards/ws-jwt-auth.guard.ts`

**Tasks:**
- [x] Install dependencies: `@nestjs/websockets`, `@nestjs/platform-socket.io`
- [ ] Create WebSocket gateway with JWT authentication
- [ ] Implement token capture handler
- [ ] Add rate limiting (max 100 tokens/min)
- [ ] Integrate with EncryptionService
- [ ] Store tokens in CredentialVault
- [ ] Write unit tests
- [ ] Test WebSocket connection with Postman/wscat

**Code Skeleton:**
```typescript
// token-capture.gateway.ts
@WebSocketGateway({
  cors: { origin: '*' }, // Configure in production
  namespace: '/token-capture',
})
export class TokenCaptureGateway {
  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('capture_token')
  async handleTokenCapture(
    @MessageBody() data: CaptureTokenDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Validate token
    // Encrypt token
    // Store in vault
    // Emit success event
  }
}
```

### Day 3-4: Chrome Extension Structure

**Files to Create:**
1. `chrome-extension/manifest.json`
2. `chrome-extension/background/service-worker.js`
3. `chrome-extension/content/facebook.js`
4. `chrome-extension/content/instagram.js`
5. `chrome-extension/popup/popup.html|css|js`
6. `chrome-extension/utils/websocket.js`
7. `chrome-extension/utils/token-detector.js`

**Tasks:**
- [ ] Create Manifest V3 structure
- [ ] Implement background service worker with WebSocket
- [ ] Build content scripts for Facebook/Instagram
- [ ] Create popup UI (connection status, logs)
- [ ] Implement token detection logic
- [ ] Add JWT authentication flow
- [ ] Test in Chrome browser

**Manifest V3 Structure:**
```json
{
  "manifest_version": 3,
  "name": "USAMKO Token Capture",
  "version": "1.0.0",
  "description": "Captures OAuth tokens for USAMKO platform",
  "permissions": [
    "storage",
    "webRequest",
    "tabs"
  ],
  "host_permissions": [
    "https://*.facebook.com/*",
    "https://*.instagram.com/*",
    "https://*.linkedin.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.facebook.com/*"],
      "js": ["content/facebook.js"]
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

### Day 5: Token Detection Logic

**Platforms to Support:**
- **Facebook**: Capture from graph API requests, local storage
- **Instagram**: Capture from private API requests, cookies
- **LinkedIn**: Capture from API requests, authorization headers

**Detection Strategy:**
```javascript
// content/facebook.js
// Intercept XMLHttpRequest and fetch() calls
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  
  // Check if request is to Facebook Graph API
  if (args[0].includes('graph.facebook.com')) {
    // Extract access token from URL or headers
    const token = extractTokenFromRequest(args);
    if (token) {
      chrome.runtime.sendMessage({
        type: 'TOKEN_CAPTURED',
        platform: 'facebook',
        token: token
      });
    }
  }
  
  return response;
};
```

### Day 6: Testing & Integration

**Test Cases:**
- [ ] WebSocket connection establishes successfully
- [ ] JWT authentication works
- [ ] Token capture from Facebook
- [ ] Token capture from Instagram
- [ ] Token encryption and storage
- [ ] Error handling (invalid tokens, connection loss)
- [ ] Rate limiting enforcement
- [ ] Popup UI shows correct status

**Manual Testing:**
1. Load extension in Chrome (chrome://extensions/)
2. Navigate to Facebook and login
3. Open popup to see connection status
4. Check that token appears in USAMKO backend
5. Verify token is encrypted in database

### Day 7: Documentation & Deployment

**Documentation:**
- [ ] Extension installation guide
- [ ] User manual (how to use)
- [ ] Developer guide (how to add new platforms)
- [ ] Troubleshooting guide
- [ ] API reference (WebSocket events)

**Deployment:**
- [ ] Package extension (.zip)
- [ ] Publish to Chrome Web Store (optional)
- [ ] Update USAMKO dashboard to show extension status

---

## 🔐 SECURITY CONSIDERATIONS

### Token Capture
- ✅ Only capture tokens from whitelisted domains
- ✅ Never log plain-text tokens
- ✅ Encrypt immediately after capture
- ✅ Validate token format before storage
- ✅ Rate limit token captures (prevent abuse)

### WebSocket Security
- ✅ JWT authentication required for all connections
- ✅ Validate JWT signature on every message
- ✅ Use wss:// (WebSocket over TLS) in production
- ✅ CORS properly configured
- ✅ Rate limiting per user

### Extension Security
- ✅ Manifest V3 (best practices)
- ✅ Content Security Policy (CSP)
- ✅ No eval() or inline scripts
- ✅ Minimal permissions (principle of least privilege)
- ✅ Secure storage of JWT token

---

## 📊 SUCCESS CRITERIA

- [ ] Extension captures tokens from Facebook
- [ ] Extension captures tokens from Instagram
- [ ] WebSocket connection stable (no disconnects)
- [ ] All tokens encrypted before storage
- [ ] JWT authentication working
- [ ] Popup UI functional
- [ ] No security vulnerabilities
- [ ] Documentation complete
- [ ] Tested on Chrome 120+

---

## 🚀 NEXT STEPS (After Phase 2)

**Phase 3: Add 6 Missing Platforms**
- Telegram adapter
- YouTube adapter
- Pinterest adapter
- Reddit adapter
- VK adapter
- ASK.fm adapter

**Extension Updates:**
- Add content scripts for new platforms
- Update manifest permissions
- Test token capture for each platform

---

## 🛠️ DEVELOPMENT COMMANDS

```bash
# Backend (WebSocket Gateway)
cd m:\USAMKO
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Run tests
npm test -- token-capture.gateway.spec.ts

# Start API with WebSocket
npm run dev

# Chrome Extension
cd chrome-extension
# Load unpacked extension in Chrome
# chrome://extensions/ → Developer mode → Load unpacked → Select chrome-extension folder
```

---

## 📝 NOTES

### WebSocket Gateway URL
- **Development:** `ws://localhost:3000/token-capture`
- **Production:** `wss://44.205.4.211/token-capture`

### JWT Token Storage
Store JWT in Chrome extension's `chrome.storage.local`:
```javascript
chrome.storage.local.set({ jwt_token: '...' });
```

### Token Refresh
If JWT expires, extension should:
1. Detect 401 Unauthorized response
2. Refresh JWT via API call
3. Reconnect WebSocket with new JWT

---

**Phase 2 Status:** Ready to implement  
**Estimated Effort:** 5-7 days  
**Complexity:** Medium  
**Risk:** Low (well-defined requirements)

✅ **Let's build the Chrome Extension!**
