/**
 * Twitter/X Token Capture - Content Script
 */

(function() {
  'use strict';

  console.log('USAMKO: Twitter token capture initialized');

  let tokenCaptured = false;

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);

    try {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('api.twitter.com') || url.includes('x.com/i/api'))) {
        // Check Authorization header
        if (args[1]?.headers?.Authorization) {
          const auth = args[1].headers.Authorization;
          if (auth.startsWith('Bearer ') && !tokenCaptured) {
            const token = auth.substring(7);
            tokenCaptured = true;

            chrome.runtime.sendMessage({
              type: 'TOKEN_CAPTURED',
              data: {
                platform: 'twitter',
                accessToken: token,
                accountId: null,
                metadata: {}
              }
            });
          }
        }
      }
    } catch (error) {}

    return response;
  };

})();
