/**
 * Google Maps Lead Collector - Content Script
 * ============================================
 *
 * Extracts business information from Google Maps search results:
 * - Business name
 * - Address
 * - Phone number
 * - Website
 * - Rating & reviews
 * - Business category
 * - Opening hours
 *
 * Usage:
 * 1. Search for businesses on Google Maps (e.g., "restaurants in Cairo")
 * 2. Extension automatically detects and extracts leads
 * 3. Click extension icon to download as CSV
 */

console.log('🗺️ Google Maps Lead Collector: Initialized');

// State management
let extractedLeads = [];
let isCollecting = false;
let observer = null;

/**
 * Check if we're on Google Maps
 */
function isGoogleMapsPage() {
  return window.location.hostname.includes('google.com') &&
         window.location.pathname.includes('/maps');
}

/**
 * Extract business details from a single listing card
 */
function extractBusinessDetails(element) {
  try {
    const business = {
      timestamp: new Date().toISOString(),
      name: '',
      address: '',
      phone: '',
      website: '',
      rating: '',
      reviews: '',
      category: '',
      hours: '',
      priceLevel: '',
      googleMapsUrl: '',
      placeId: ''
    };

    // Business Name
    const nameElement = element.querySelector('[role="article"] h3, .qBF1Pd, [jstcache="3"]');
    if (nameElement) {
      business.name = nameElement.textContent.trim();
    }

    // Rating and Reviews
    const ratingElement = element.querySelector('[role="img"][aria-label*="star"], .MW4etd');
    if (ratingElement) {
      const ariaLabel = ratingElement.getAttribute('aria-label') || '';
      const ratingMatch = ariaLabel.match(/(\d+\.?\d*)\s*star/);
      const reviewsMatch = ariaLabel.match(/(\d+(?:,\d+)*)\s*review/);

      if (ratingMatch) business.rating = ratingMatch[1];
      if (reviewsMatch) business.reviews = reviewsMatch[1].replace(',', '');
    }

    // Category
    const categoryElement = element.querySelector('.W4Efsd:nth-of-type(2), [jsaction*="category"]');
    if (categoryElement) {
      business.category = categoryElement.textContent.trim();
    }

    // Price Level
    const priceElement = element.querySelector('[aria-label*="Price"], .mgr77e span');
    if (priceElement) {
      business.priceLevel = priceElement.textContent.trim();
    }

    // Extract Place ID and URL from href
    const linkElement = element.querySelector('a[href*="/maps/place"]');
    if (linkElement) {
      const href = linkElement.getAttribute('href');
      business.googleMapsUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;

      // Extract place ID
      const placeIdMatch = href.match(/!1s([^!]+)/);
      if (placeIdMatch) {
        business.placeId = placeIdMatch[1];
      }
    }

    // Only return if we have at least a name
    return business.name ? business : null;

  } catch (error) {
    console.error('Error extracting business:', error);
    return null;
  }
}

/**
 * Extract detailed information when a place is selected
 */
function extractDetailedInfo() {
  try {
    const details = {
      address: '',
      phone: '',
      website: '',
      hours: ''
    };

    // Address
    const addressButton = document.querySelector('button[data-item-id="address"]');
    if (addressButton) {
      details.address = addressButton.getAttribute('aria-label')?.replace('Address: ', '') || '';
    }

    // Phone
    const phoneButton = document.querySelector('button[data-item-id*="phone"]');
    if (phoneButton) {
      const phoneText = phoneButton.getAttribute('aria-label') || phoneButton.textContent;
      details.phone = phoneText.replace('Phone: ', '').replace('Copy phone number', '').trim();
    }

    // Website
    const websiteLink = document.querySelector('a[data-item-id="authority"]');
    if (websiteLink) {
      details.website = websiteLink.getAttribute('href') || '';
    }

    // Opening Hours
    const hoursButton = document.querySelector('button[aria-label*="Hide open hours"]');
    if (hoursButton) {
      details.hours = hoursButton.getAttribute('aria-label')?.replace('Hide open hours for the week, ', '') || '';
    }

    return details;

  } catch (error) {
    console.error('Error extracting detailed info:', error);
    return null;
  }
}

/**
 * Collect leads from current search results
 */
function collectLeadsFromResults() {
  console.log('🔍 Scanning Google Maps results...');

  // Find all business listing cards
  const listings = document.querySelectorAll('[role="feed"] > div, .Nv2PK, [jsaction*="mouseover"]');

  let newLeadsCount = 0;

  listings.forEach(listing => {
    const business = extractBusinessDetails(listing);

    if (business && business.name) {
      // Check if already extracted
      const exists = extractedLeads.some(lead =>
        lead.name === business.name && lead.address === business.address
      );

      if (!exists) {
        extractedLeads.push(business);
        newLeadsCount++;
        console.log(`✅ Collected: ${business.name}`);
      }
    }
  });

  if (newLeadsCount > 0) {
    console.log(`📊 Total leads collected: ${extractedLeads.length} (${newLeadsCount} new)`);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'LEADS_UPDATED',
      platform: 'google-maps',
      count: extractedLeads.length,
      leads: extractedLeads
    });
  }

  return newLeadsCount;
}

/**
 * Auto-scroll to load more results
 */
async function autoScroll() {
  const feedElement = document.querySelector('[role="feed"]');
  if (!feedElement) {
    console.log('⚠️ Feed element not found');
    return false;
  }

  const previousHeight = feedElement.scrollHeight;
  feedElement.scrollTop = feedElement.scrollHeight;

  // Wait for new content to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newHeight = feedElement.scrollHeight;
  return newHeight > previousHeight; // Returns true if more content loaded
}

/**
 * Start collecting leads automatically
 */
async function startAutoCollection(maxResults = 100) {
  if (isCollecting) {
    console.log('⚠️ Collection already in progress');
    return;
  }

  console.log(`🚀 Starting auto-collection (max ${maxResults} results)...`);
  isCollecting = true;

  let attempts = 0;
  const maxAttempts = 10;

  while (isCollecting && extractedLeads.length < maxResults && attempts < maxAttempts) {
    // Collect from current view
    collectLeadsFromResults();

    // Try to scroll for more
    const hasMore = await autoScroll();

    if (!hasMore) {
      attempts++;
      console.log(`⏳ No new results, attempt ${attempts}/${maxAttempts}`);

      if (attempts >= 3) {
        console.log('✅ Reached end of results');
        break;
      }
    } else {
      attempts = 0; // Reset attempts if we found more
    }

    // Wait between scrolls
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  isCollecting = false;
  console.log(`🎉 Collection complete! Total leads: ${extractedLeads.length}`);

  // Final notification
  chrome.runtime.sendMessage({
    type: 'COLLECTION_COMPLETE',
    platform: 'google-maps',
    count: extractedLeads.length,
    leads: extractedLeads
  });
}

/**
 * Export leads to CSV
 */
function exportToCSV() {
  if (extractedLeads.length === 0) {
    alert('No leads collected yet. Search for businesses on Google Maps first.');
    return;
  }

  // CSV headers
  const headers = [
    'Business Name',
    'Address',
    'Phone',
    'Website',
    'Rating',
    'Reviews',
    'Category',
    'Price Level',
    'Hours',
    'Google Maps URL',
    'Place ID',
    'Collected At'
  ];

  // CSV rows
  const rows = extractedLeads.map(lead => [
    lead.name,
    lead.address,
    lead.phone,
    lead.website,
    lead.rating,
    lead.reviews,
    lead.category,
    lead.priceLevel,
    lead.hours,
    lead.googleMapsUrl,
    lead.placeId,
    lead.timestamp
  ]);

  // Build CSV content
  let csvContent = headers.join(',') + '\n';
  rows.forEach(row => {
    const escapedRow = row.map(cell => {
      const str = String(cell || '');
      // Escape quotes and wrap in quotes if contains comma
      return str.includes(',') || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    });
    csvContent += escapedRow.join(',') + '\n';
  });

  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `google-maps-leads-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`📥 Downloaded ${extractedLeads.length} leads to CSV`);
}

/**
 * Clear collected leads
 */
function clearLeads() {
  extractedLeads = [];
  console.log('🗑️ Leads cleared');

  chrome.runtime.sendMessage({
    type: 'LEADS_CLEARED',
    platform: 'google-maps'
  });
}

/**
 * Monitor for new results (when scrolling manually)
 */
function setupMutationObserver() {
  const feedElement = document.querySelector('[role="feed"]');
  if (!feedElement) return;

  observer = new MutationObserver((mutations) => {
    // Collect new leads when DOM changes
    collectLeadsFromResults();
  });

  observer.observe(feedElement, {
    childList: true,
    subtree: true
  });

  console.log('👁️ Monitoring for new results...');
}

/**
 * Listen for messages from background/popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message:', message.type);

  switch (message.type) {
    case 'START_COLLECTION':
      startAutoCollection(message.maxResults || 100);
      sendResponse({ success: true, message: 'Collection started' });
      break;

    case 'STOP_COLLECTION':
      isCollecting = false;
      sendResponse({ success: true, message: 'Collection stopped', count: extractedLeads.length });
      break;

    case 'GET_LEADS':
      sendResponse({ success: true, leads: extractedLeads, count: extractedLeads.length });
      break;

    case 'EXPORT_CSV':
      exportToCSV();
      sendResponse({ success: true, message: 'CSV exported' });
      break;

    case 'CLEAR_LEADS':
      clearLeads();
      sendResponse({ success: true, message: 'Leads cleared' });
      break;

    case 'COLLECT_CURRENT':
      const count = collectLeadsFromResults();
      sendResponse({ success: true, message: `Collected ${count} new leads`, total: extractedLeads.length });
      break;

    default:
      sendResponse({ success: false, message: 'Unknown command' });
  }

  return true; // Keep channel open for async response
});

/**
 * Initialize when page loads
 */
function initialize() {
  if (!isGoogleMapsPage()) {
    console.log('⚠️ Not on Google Maps, extension inactive');
    return;
  }

  console.log('✅ Google Maps Lead Collector: Active');

  // Initial collection
  setTimeout(() => {
    collectLeadsFromResults();
    setupMutationObserver();
  }, 2000);

  // Notify that extension is ready
  chrome.runtime.sendMessage({
    type: 'MAPS_READY',
    platform: 'google-maps'
  });
}

// Run when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Re-initialize on navigation (Google Maps is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 Navigation detected, re-initializing...');
    if (observer) observer.disconnect();
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

console.log('🗺️ Google Maps Lead Collector: Script loaded');
