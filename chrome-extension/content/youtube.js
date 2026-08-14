/**
 * YouTube Token Capture - Content Script
 */

(function() {
  'use strict';

  console.log('USAMKO: YouTube token capture initialized');

  let tokenCaptured = false;

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);

    try {
      const url = args[0];
      if (typeof url === 'string' && url.includes('youtube.com/youtubei/')) {
        // Check Authorization header
        if (args[1]?.headers?.Authorization) {
          const auth = args[1].headers.Authorization;
          if (auth.startsWith('Bearer ') && !tokenCaptured) {
            tokenCaptured = true;

            chrome.runtime.sendMessage({
              type: 'TOKEN_CAPTURED',
              data: {
                platform: 'youtube',
                accessToken: auth.substring(7),
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
