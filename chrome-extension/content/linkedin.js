/**
 * LinkedIn Token & Cookie Capture - Content Script
 *
 * Automatically captures LinkedIn authentication cookies (li_at, JSESSIONID)
 * when the user visits LinkedIn while logged in.
 */

(function() {
  'use strict';

  let captured = false;

  function captureLinkedInCookies() {
    if (captured) return;

    // Get cookies from document
    const cookies = document.cookie;
    const liAt = getCookie('li_at');
    const jsessionId = getCookie('JSESSIONID');

    if (!liAt) return;

    captured = true;
    console.log('USAMKO: LinkedIn cookies detected');

    // Extract profile info from page
    let username = '';
    let accountName = '';
    try {
      const profileLink = document.querySelector('a[href*="/in/"]');
      if (profileLink) {
        username = profileLink.href.match(/\/in\/([^\/\?]+)/)?.[1] || '';
      }
      const nameEl = document.querySelector('.t-16.t-black.t-bold') ||
                     document.querySelector('[data-control-name="identity_profile_photo"]');
      accountName = nameEl?.textContent?.trim() || username || 'LinkedIn Account';
    } catch (e) {}

    chrome.runtime.sendMessage({
      type: 'TOKEN_CAPTURED',
      data: {
        platform: 'linkedin',
        accountId: username || 'linkedin-' + Date.now(),
        accountName: accountName,
        username: username,
        accessToken: liAt,
        metadata: {
          cookies: {
            li_at: liAt,
            JSESSIONID: jsessionId || '',
          },
          capturedAt: new Date().toISOString(),
          captureMethod: 'auto',
        },
      },
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('USAMKO: Extension not connected, cookies stored locally');
        captured = false;
      } else {
        console.log('USAMKO: LinkedIn cookies captured successfully');
      }
    });
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Capture on page load (with delay for SPA navigation)
  setTimeout(captureLinkedInCookies, 3000);

  // Also capture on navigation within LinkedIn SPA
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      captured = false;
      setTimeout(captureLinkedInCookies, 2000);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
