/**
 * LinkedIn Token Capture - Content Script
 */

(function() {
  'use strict';

  console.log('USAMKO: LinkedIn token capture initialized');

  let tokenCaptured = false;

  function extractLinkedInToken() {
    let tokenData = {
      platform: 'linkedin',
      accountId: null,
      accountName: null,
      username: null,
      accessToken: null,
      expiresAt: null,
      metadata: {}
    };

    // Intercept API requests
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch(...args);
      const clonedResponse = response.clone();

      try {
        const url = args[0];
        if (typeof url === 'string' && url.includes('linkedin.com/api')) {
          // Check Authorization header
          if (args[1]?.headers?.Authorization) {
            const auth = args[1].headers.Authorization;
            if (auth.startsWith('Bearer ') && !tokenCaptured) {
              tokenData.accessToken = auth.substring(7);
              captureToken(tokenData);
            }
          }
        }
      } catch (error) {}

      return response;
    };

    return tokenData;
  }

  function captureToken(tokenData) {
    if (!tokenData.accessToken || tokenCaptured) return;

    tokenCaptured = true;
    console.log('Capturing LinkedIn token...');

    chrome.runtime.sendMessage({
      type: 'TOKEN_CAPTURED',
      data: tokenData
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send token:', chrome.runtime.lastError);
        tokenCaptured = false;
      }
    });
  }

  extractLinkedInToken();

})();
