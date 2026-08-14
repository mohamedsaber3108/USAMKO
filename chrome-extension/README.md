# USAMKO Token Capture - Chrome Extension

A Chrome extension that captures OAuth tokens from social media platforms and relays them to the USAMKO backend via secure WebSocket connection.

## 🌐 Supported Platforms

- ✅ Facebook
- ✅ Instagram
- ✅ LinkedIn
- ✅ Twitter/X
- ✅ YouTube
- ✅ Telegram

## 🚀 Installation

### Development Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder: `m:\USAMKO\chrome-extension`
5. The extension will appear in your extensions list

### Production Mode

1. Package the extension: `zip -r usamko-extension.zip chrome-extension/`
2. Submit to Chrome Web Store (optional)
3. Install from `.crx` file or Chrome Web Store

## ⚙️ Configuration

### Step 1: Get JWT Token

1. Log in to USAMKO dashboard at `http://localhost:3001` (or your production URL)
2. Go to **Settings** → **API Access**
3. Copy your JWT token

### Step 2: Configure Extension

1. Click the USAMKO extension icon in Chrome toolbar
2. Click "Configure" button
3. Paste your JWT token in the input field
4. Click "Save"
5. Extension will automatically connect to backend

### Step 3: Capture Tokens

1. Navigate to any supported platform (Facebook, Instagram, etc.)
2. Log in to your account
3. Extension will automatically detect and capture tokens
4. Check extension popup for captured accounts

## 🔧 How It Works

### Architecture

```
Browser (Facebook/Instagram)
         ↓
  [Content Script]
         ↓ (detects token)
  [Background Worker]
         ↓ (WebSocket)
   USAMKO Backend
         ↓ (encrypts & stores)
    PostgreSQL
```

### Token Detection

The extension uses multiple methods to detect tokens:

1. **Network Interception**: Monitors API requests for Authorization headers
2. **LocalStorage/SessionStorage**: Checks browser storage for saved tokens
3. **Cookies**: Captures session cookies when available
4. **Response Parsing**: Extracts tokens from API responses

### Security

- ✅ All communication over WebSocket Secure (WSS) in production
- ✅ JWT authentication required for all connections
- ✅ Tokens encrypted before storage
- ✅ No plain-text token logging
- ✅ Content Security Policy enforced

## 📊 Extension Popup

The extension popup shows:

- **Connection Status**: Connected/Disconnected indicator
- **Statistics**: Total accounts, active accounts
- **Recent Activity**: Last 20 token captures
- **Configuration**: JWT token management

### Popup Features

- ✅ Real-time connection status
- ✅ Connect/Disconnect controls
- ✅ JWT token configuration
- ✅ Activity logs
- ✅ Statistics dashboard

## 🛠️ Development

### File Structure

```
chrome-extension/
├── manifest.json                 # Extension manifest (Manifest V3)
├── background/
│   └── service-worker.js        # WebSocket connection manager
├── content/
│   ├── facebook.js              # Facebook token detection
│   ├── instagram.js             # Instagram token detection
│   ├── linkedin.js              # LinkedIn token detection
│   ├── twitter.js               # Twitter/X token detection
│   ├── youtube.js               # YouTube token detection
│   └── telegram.js              # Telegram token detection
├── popup/
│   ├── popup.html               # Extension popup UI
│   ├── popup.css                # Popup styles
│   └── popup.js                 # Popup logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Adding a New Platform

To add support for a new platform:

1. **Create content script**: `content/platform-name.js`
2. **Add to manifest.json**:
```json
{
  "matches": ["https://*.platform.com/*"],
  "js": ["content/platform-name.js"],
  "run_at": "document_start"
}
```
3. **Implement token detection** using the pattern from existing scripts
4. **Test** on the platform's website

### Testing

#### Manual Testing

1. Load extension in Chrome
2. Navigate to supported platform
3. Log in
4. Check console for "Token captured" message
5. Verify in USAMKO dashboard that account appears

#### Debug Mode

Enable debug logging:
```javascript
// In any content script
console.log('USAMKO: Token detection active');
```

Check logs in:
- **Content Script**: Right-click page → Inspect → Console
- **Background Worker**: chrome://extensions/ → Service worker → Inspect
- **Popup**: Right-click popup → Inspect

## 🔒 Security Best Practices

### For Users

- ✅ Only install from trusted sources
- ✅ Review permissions before installation
- ✅ Keep JWT token secret
- ✅ Disconnect when not in use
- ✅ Clear logs regularly

### For Developers

- ✅ Never log plain-text tokens
- ✅ Use HTTPS/WSS in production
- ✅ Validate all JWT tokens
- ✅ Implement rate limiting
- ✅ Follow Manifest V3 best practices

## 🐛 Troubleshooting

### Extension Not Connecting

1. Check JWT token is valid
2. Verify backend is running (`http://localhost:3000`)
3. Check WebSocket URL in `service-worker.js`
4. Look for errors in service worker console

### Tokens Not Detected

1. Verify platform is supported
2. Check content script is injected (Console → Sources)
3. Ensure you're logged into the platform
4. Try refreshing the page
5. Check content script console for errors

### Connection Drops

1. Check internet connection
2. Verify backend is running
3. Check JWT token hasn't expired
4. Look for WebSocket errors in background console

## 📚 API Reference

### Background Messages

#### From Popup/Content → Background

```javascript
// Set JWT token
chrome.runtime.sendMessage({
  type: 'SET_JWT_TOKEN',
  token: 'your-jwt-token'
});

// Get connection status
chrome.runtime.sendMessage({
  type: 'GET_CONNECTION_STATUS'
}, (response) => {
  console.log(response.connected, response.hasToken);
});

// Capture token
chrome.runtime.sendMessage({
  type: 'TOKEN_CAPTURED',
  data: {
    platform: 'facebook',
    accountId: '123456',
    accessToken: 'token...',
    // ... other fields
  }
});

// Disconnect
chrome.runtime.sendMessage({
  type: 'DISCONNECT'
});
```

#### From Background → Popup

```javascript
chrome.runtime.sendMessage({
  type: 'BACKGROUND_EVENT',
  eventType: 'connected' | 'disconnected' | 'success' | 'error' | 'stats',
  data: { /* event-specific data */ }
});
```

### WebSocket Events

#### Client → Server

```javascript
{
  event: 'capture_token',
  data: {
    platform: string,
    accountId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    metadata?: object
  }
}
```

#### Server → Client

```javascript
{
  event: 'token_saved',
  data: {
    success: boolean,
    accountId: string,
    platform: string,
    message: string
  }
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Change WebSocket URL to production: `wss://44.205.4.211/token-capture`
- [ ] Update icons (16x16, 48x48, 128x128)
- [ ] Test on all supported platforms
- [ ] Minify JavaScript files
- [ ] Remove console.log statements
- [ ] Update manifest version
- [ ] Package extension: `zip -r usamko-extension.zip chrome-extension/`
- [ ] Submit to Chrome Web Store (optional)

### Chrome Web Store Submission

1. Create developer account: https://chrome.google.com/webstore/devconsole
2. Pay $5 registration fee
3. Prepare assets:
   - Extension icons (128x128, 48x48, 16x16)
   - Promotional images (1400x560, 440x280, 920x680)
   - Screenshots
   - Description
4. Upload `.zip` file
5. Submit for review

## 📄 License

This extension is part of USAMKO platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues**: https://github.com/mohamedsaber3108/USAMKO/issues
- **Email**: support@usamko.com
- **Discord**: [USAMKO Community](https://discord.gg/usamko)

---

**Version**: 1.0.0  
**Last Updated**: 2026-08-14  
**Manifest Version**: 3
