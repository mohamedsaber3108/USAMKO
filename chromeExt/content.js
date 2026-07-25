// USAMKO Content Script
// Preserves all original functionality: message relay between background and page
// Rebranded from xhSenderPro to USAMKO

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const event = new CustomEvent('USAMKOEvent', {
    detail: { type: 'data', payload: message }
  });
  window.dispatchEvent(event);

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('pageScript.js');
  (document.head || document.documentElement).appendChild(script);

  return true;
});

var wakeup = function () {
  try {
    chrome.runtime.sendMessage('ping').catch(error => {
      console.error('Error in wakeup function:', error);
    });
  } catch (error) {
    console.error('Error in wakeup function:', error);
  }
};

wakeup();
