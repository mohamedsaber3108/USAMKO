/**
 * Facebook Token Capture - Content Script
 *
 * Detects and captures OAuth tokens from Facebook sessions.
 * Runs in the context of facebook.com pages.
 */

(function() {
  'use strict';

  console.log('USAMKO: Facebook token capture initialized');

  let tokenCaptured = false;

  /**
   * Extract access token from various sources
   */
  function extractFacebookToken() {
    let token = null;
    let tokenData = {
      platform: 'facebook',
      accountId: null,
      accountName: null,
      username: null,
      accessToken: null,
      expiresAt: null,
      metadata: {}
    };

    // Method 1: Check localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        // Look for access token patterns
        if (value && (key.includes('token') || key.includes('auth') || key.includes('session'))) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.accessToken || parsed.access_token) {
              tokenData.accessToken = parsed.accessToken || parsed.access_token;
              tokenData.expiresAt = parsed.expiresIn ? Date.now() + parsed.expiresIn * 1000 : null;
              console.log('Token found in localStorage');
              break;
            }
          } catch (e) {
            // Not JSON, check if value itself is a token
            if (value.length > 50 && value.startsWith('EAA')) {
              tokenData.accessToken = value;
              console.log('Token found in localStorage (direct)');
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking localStorage:', error);
    }

    // Method 2: Intercept network requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch(...args);

      // Clone response to read it
      const clonedResponse = response.clone();

      try {
        const url = args[0];

        // Check if it's a Graph API request
        if (typeof url === 'string' && url.includes('graph.facebook.com')) {
          // Extract token from URL parameters
          const urlObj = new URL(url);
          const accessToken = urlObj.searchParams.get('access_token');

          if (accessToken && !tokenCaptured) {
            tokenData.accessToken = accessToken;
            console.log('Token found in Graph API request');
            captureToken(tokenData);
          }
        }

        // Check response body for tokens
        if (response.headers.get('content-type')?.includes('application/json')) {
          const data = await clonedResponse.json();

          if (data.access_token && !tokenCaptured) {
            tokenData.accessToken = data.access_token;
            tokenData.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
            console.log('Token found in API response');
            captureToken(tokenData);
          }
        }
      } catch (error) {
        // Ignore errors in response parsing
      }

      return response;
    };

    // Method 3: Check cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name.includes('token') || name.includes('auth')) {
        if (value && value.length > 50) {
          tokenData.metadata.cookies = tokenData.metadata.cookies || {};
          tokenData.metadata.cookies[name] = value;
        }
      }
    }

    // Method 4: Extract user info from page
    try {
      // Get user ID from page
      const userIdMatch = document.documentElement.innerHTML.match(/"userID":"(\d+)"/);
      if (userIdMatch) {
        tokenData.accountId = userIdMatch[1];
      }

      // Get user name
      const userNameMatch = document.documentElement.innerHTML.match(/"name":"([^"]+)"/);
      if (userNameMatch) {
        tokenData.accountName = userNameMatch[1];
      }

      // Get username from URL
      const pathMatch = window.location.pathname.match(/\/([^\/]+)/);
      if (pathMatch && pathMatch[1] !== 'home') {
        tokenData.username = pathMatch[1];
      }
    } catch (error) {
      console.error('Error extracting user info:', error);
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
      return; // Already captured
    }

    tokenCaptured = true;

    console.log('Capturing Facebook token...');

    chrome.runtime.sendMessage({
      type: 'TOKEN_CAPTURED',
      data: tokenData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send token:', chrome.runtime.lastError);
        tokenCaptured = false; // Allow retry
      } else {
        console.log('Token sent successfully:', response);
      }
    });
  }

  /**
   * Monitor for token in page load
   */
  function monitorPageLoad() {
    // Wait for page to load
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
    const tokenData = extractFacebookToken();

    if (tokenData.accessToken) {
      captureToken(tokenData);
    } else {
      console.log('No Facebook token found yet');
    }
  }

  /**
   * Intercept XMLHttpRequest
   */
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    this.addEventListener('load', function() {
      try {
        if (this._url && this._url.includes('graph.facebook.com')) {
          // Check URL for token
          const urlObj = new URL(this._url, window.location.origin);
          const accessToken = urlObj.searchParams.get('access_token');

          if (accessToken && !tokenCaptured) {
            const tokenData = extractFacebookToken();
            tokenData.accessToken = accessToken;
            captureToken(tokenData);
          }
        }

        // Check response
        if (this.responseText) {
          try {
            const data = JSON.parse(this.responseText);
            if (data.access_token && !tokenCaptured) {
              const tokenData = extractFacebookToken();
              tokenData.accessToken = data.access_token;
              tokenData.expiresAt = data.expires_in ? Date.now() + data.expires_in * 1000 : null;
              captureToken(tokenData);
            }
          } catch (e) {
            // Not JSON
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
