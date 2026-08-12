// USAMKO Background Service Worker
// Preserves all original functionality:
// - Facebook GraphQL API interception
// - Twitter/X API header capture
// - Instagram API token capture
// - Business page message tracking
// Rebranded from xhSenderPro to USAMKO

const fb_api_req_names = [
  'CometUFIReactionsDialogQuery',
  'GroupsCometPeopleProfilesPaginatedListPaginationQuery',
  'GroupsCometMembersPageNewMembersSectionRefetchQuery',
];

const fb_api_req_names_1 = [
  'CometUFIReactionsDialogTabContentRefetchQueryStable',
  'GroupsCometMembersPageNewForumMembersSectionRefetchQuery',
];

// Facebook GraphQL interception
chrome.webRequest.onBeforeRequest.addListener(
  async details => {
    const formData = details?.requestBody?.formData;
    if (!formData) return;

    const friendlyName = formData['fb_api_req_friendly_name'];
    if (!friendlyName) return;

    if (fb_api_req_names.includes(friendlyName[0])) {
      sendMessageToTabs(JSON.stringify(details.requestBody.formData));
    } else if (fb_api_req_names_1.includes(friendlyName[0])) {
      sendMessageToTabs({
        fb_post_react: true,
        data: {
          doc_id: formData['doc_id'] ? formData['doc_id'][0] : null,
          __dyn: formData['__dyn'] ? formData['__dyn'][0] : null,
          variables: formData['variables'] ? formData['variables'][0] : null,
          fb_dtsg: formData['fb_dtsg'] ? formData['fb_dtsg'][0] : null,
        },
      });
    }
  },
  {
    urls: [
      'https://www.facebook.com/api/graphql/',
      'https://web.facebook.com/api/graphql/',
      'https://mobile.facebook.com/api/graphql/',
      'https://m.facebook.com/api/graphql/',
      'https://mbasic.facebook.com/api/graphql/',
    ],
  },
  ['requestBody']
);

// Facebook Business Page message interception
chrome.webRequest.onBeforeRequest.addListener(
  async details => {
    if (details?.method !== 'POST') return;
    if (!details?.url?.includes('https://business.facebook.com/api/graphql/')) return;

    const formData = details?.requestBody?.formData;
    if (!formData) return;

    try {
      const variables = JSON.parse(formData['variables'] ? formData['variables'][0] : '{}');
      if (!variables.pageID) return;
    } catch (e) {
      return;
    }

    if (formData['__dyn'] && formData['fb_dtsg'] && formData['__user']) {
      const variables = JSON.parse(formData['variables'][0]);
      sendMessageToTabs({
        business_page_message: true,
        data: {
          __dyn: formData['__dyn'][0],
          fb_dtsg: formData['fb_dtsg'][0],
          pageID: variables.pageID,
          sender: formData['__user'][0],
        },
      });
    }
  },
  { urls: ['https://business.facebook.com/api/graphql/*'] },
  ['requestBody']
);

// Twitter/X API header interception
chrome.webRequest.onBeforeSendHeaders.addListener(
  async details => {
    if (details?.method !== 'GET') return;
    if (
      !details?.url?.includes('twitter.com/i/api/graphql/') &&
      !details?.url?.includes('api.twitter.com/graphql/')
    )
      return;

    const headers = {};
    for (const header of details.requestHeaders) {
      if (header.name === 'sec-ch-ua' || header.name === 'sec-ch-ua-platform') continue;
      headers[header.name] = header.value;
    }

    sendMessageToTabs({ url: details.url, headers: headers });
  },
  {
    urls: ['https://twitter.com/i/api/graphql/*', 'https://api.twitter.com/graphql/*'],
  },
  ['requestHeaders']
);

// Instagram API token interception
chrome.webRequest.onBeforeSendHeaders.addListener(
  async details => {
    const tokens = {};
    for (const header of details.requestHeaders) {
      if (header.name === 'X-CSRFToken' || header.name === 'X-IG-App-ID') {
        tokens[header.name] = header.value;
      }
    }

    if (Object.keys(tokens).length > 0) {
      sendMessageToTabs({ insta_hash_ex: true, data: tokens });
    }
  },
  { urls: ['https://www.instagram.com/api/v1/tags/*'] },
  ['requestHeaders']
);

// Send message to all tabs
function sendMessageToTabs(message) {
  chrome.tabs.query({}, function (tabs) {
    for (const tab of tabs) {
      if (tab?.id) {
        try {
          chrome.tabs.sendMessage(tab.id, message).catch(error => {
            // Tab may not have content script, ignore
          });
        } catch (error) {
          console.error('Error sending message to tab:', error);
        }
      }
    }
  });
}
