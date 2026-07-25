// USAMKO Page Script
// Preserves all original functionality: captures platform data into window variables
// Rebranded from senderxHRPro to usamko

window.addEventListener('USAMKOEvent', function (event) {
  var data = event.detail.payload;

  if (data && data.business_page_message) {
    window.usamko_fb_page_message = data.data;
  } else if (data && data.fb_post_react) {
    window.usamko_fb_post_react = data.data;
  } else {
    window.usamko = data;
  }
});
