/**
 * Instagram Token Capture - Content Script
 *
 * Detects and captures OAuth tokens from Instagram sessions.
 * Runs in the context of instagram.com pages.
 */

(function() {
  'use strict';

  console.log('USAMKO: Instagram token capture initialized');

  let tokenCaptured = false;

  /**
   * Extract access token from Instagram
   */
  function extractInstagramToken() {
    let tokenData = {
      platform: 'instagram',
      accountId: null,
      accountName: null,
      username: null,
      accessToken: null,
      expiresAt: null,
      metadata: {}
    };

    // Method 1: Check localStorage/sessionStorage
    try {
      const storages = [localStorage, sessionStorage];

      for (const storage of storages) {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          const value = storage.getItem(key);

          if (value && (key.includes('token') || key.includes('auth') || key.includes('session'))) {
            try {
              const parsed = JSON.parse(value);
              if (parsed.accessToken || parsed.access_token || parsed.token) {
                tokenData.accessToken = parsed.accessToken || parsed.access_token || parsed.token;
                tokenData.expiresAt = parsed.expiresIn ? Date.now() + parsed.expiresIn * 1000 : null;
                console.log('Token found in storage');
                break;
              }
            } catch (e) {
              // Check if value itself is a token
              if (value.length > 50) {
                tokenData.accessToken = value;
                console.log('Token found in storage (direct)');
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking storage:', error);
    }

    // Method 2: Intercept fetch requests to Instagram API
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch(...args);
      const clonedResponse = response.clone();

      try {
        const url = args[0];

        // Check if it's an Instagram API request
        if (typeof url === 'string' && (
          url.includes('instagram.com/api') ||
          url.includes('i.instagram.com') ||
          url.includes('graph.instagram.com')
        )) {
          // Extract token from Authorization header
          if (args[1]?.headers) {
            const authHeader = args[1].headers.Authorization || args[1].headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
              const token = authHeader.substring(7);
              if (token && !tokenCaptured) {
                tokenData.accessToken = token;
                console.log('Token found in Authorization header');
                captureToken(tokenData);
              }
            }
          }

          // Check response for token
          if (response.headers.get('content-type')?.includes('application/json')) {
            try {
              const data = await clonedResponse.json();

              if (data.access_token && !tokenCaptured) {
                tokenData.accessToken = data.access_token;
                tokenData.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
                console.log('Token found in API response');
                captureToken(tokenData);
              }

              // Check for user data
              if (data.user || data.graphql?.user) {
                const user = data.user || data.graphql.user;
                tokenData.accountId = user.id || user.pk;
                tokenData.username = user.username;
                tokenData.accountName = user.full_name || user.username;
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }

      return response;
    };

    // Method 3: Extract user info from page data
    try {
      // Instagram stores data in window._sharedData or __additionalDataLoaded
      if (window._sharedData) {
        const configUser = window._sharedData.config?.viewer;
        if (configUser) {
          tokenData.accountId = configUser.id;
          tokenData.username = configUser.username;
          tokenData.accountName = configUser.full_name || configUser.username;
        }
      }

      // Check page HTML for embedded data
      const scripts = document.getElementsByTagName('script');
      for (const script of scripts) {
        if (script.textContent.includes('window._sharedData')) {
          try {
            const match = script.textContent.match(/window\._sharedData\s*=\s*({.+?});/);
            if (match) {
              const sharedData = JSON.parse(match[1]);
              const user = sharedData.config?.viewer;
              if (user) {
                tokenData.accountId = user.id;
                tokenData.username = user.username;
                tokenData.accountName = user.full_name || user.username;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Extract from URL
      const pathMatch = window.location.pathname.match(/\/([^\/]+)/);
      if (pathMatch && pathMatch[1] !== 'explore' && pathMatch[1] !== 'reels') {
        tokenData.username = pathMatch[1];
      }
    } catch (error) {
      console.error('Error extracting user info:', error);
    }

    // Method 4: Check cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sessionid' || name.includes('token') || name.includes('auth')) {
        if (value && value.length > 10) {
          tokenData.metadata.cookies = tokenData.metadata.cookies || {};
          tokenData.metadata.cookies[name] = value;

          // sessionid might be useful
          if (name === 'sessionid') {
            tokenData.metadata.sessionId = value;
          }
        }
      }
    }

    return tokenData;
  }

  /**
   * Send token to background script
   */
  function captureToken(tokenData) {
    if (!tokenData.accessToken) {
      return;
    }

    if (tokenCaptured) {
      return;
    }

    tokenCaptured = true;

    console.log('Capturing Instagram token...');

    chrome.runtime.sendMessage({
      type: 'TOKEN_CAPTURED',
      data: tokenData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send token:', chrome.runtime.lastError);
        tokenCaptured = false;
      } else {
        console.log('Token sent successfully:', response);
      }
    });
  }

  /**
   * Monitor for token in page load
   */
  function monitorPageLoad() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkForToken, 2000);
      });
    } else {
      setTimeout(checkForToken, 2000);
    }
  }

  /**
   * Check for token in page
   */
  function checkForToken() {
    const tokenData = extractInstagramToken();

    if (tokenData.accessToken) {
      captureToken(tokenData);
    } else {
      console.log('No Instagram token found yet');
    }
  }

  /**
   * Intercept XMLHttpRequest
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  let requestHeaders = {};

  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    requestHeaders[header] = value;
    return originalXHRSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    requestHeaders = {};
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    // Check for Authorization header
    if (requestHeaders.Authorization && requestHeaders.Authorization.startsWith('Bearer ')) {
      const token = requestHeaders.Authorization.substring(7);
      if (token && !tokenCaptured) {
        const tokenData = extractInstagramToken();
        tokenData.accessToken = token;
        captureToken(tokenData);
      }
    }

    this.addEventListener('load', function() {
      try {
        if (this._url && (
          this._url.includes('instagram.com/api') ||
          this._url.includes('i.instagram.com')
        )) {
          // Check response
          if (this.responseText) {
            try {
              const data = JSON.parse(this.responseText);
              if (data.access_token && !tokenCaptured) {
                const tokenData = extractInstagramToken();
                tokenData.accessToken = data.access_token;
                tokenData.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
                captureToken(tokenData);
              }
            } catch (e) {
              // Not JSON
            }
          }
        }
      } catch (error) {
        // Ignore errors
      }
    });

    return originalXHRSend.apply(this, args);
  };

  // Start monitoring
  monitorPageLoad();

  // Re-check every 30 seconds
  setInterval(checkForToken, 30000);

})();
