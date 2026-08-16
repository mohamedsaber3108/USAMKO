/**
 * USAMKO Token Capture - Popup UI Logic
 */

// DOM Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const connectBtn = document.getElementById('connectBtn');
const configCard = document.getElementById('configCard');
const jwtTokenInput = document.getElementById('jwtToken');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const totalAccountsEl = document.getElementById('totalAccounts');
const connectedAccountsEl = document.getElementById('connectedAccounts');
const activityList = document.getElementById('activityList');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const leadsCollectedEl = document.getElementById('leadsCollected');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const mapsStatusEl = document.getElementById('mapsStatus');

// State
let isConnected = false;
let hasJwtToken = false;
let activityLogs = [];

/**
 * Initialize popup
 */
function init() {
  loadSavedData();
  checkConnectionStatus();
  setupEventListeners();
  loadActivityLogs();

  // Listen for background events
  chrome.runtime.onMessage.addListener(handleBackgroundEvent);
}

/**
 * Load saved data from storage
 */
function loadSavedData() {
  chrome.storage.local.get(['jwt_token', 'activity_logs', 'stats'], (result) => {
    if (result.jwt_token) {
      hasJwtToken = true;
      jwtTokenInput.value = '••••••••••••••••';
      configCard.classList.add('hidden');
    }

    if (result.activity_logs) {
      activityLogs = result.activity_logs;
      renderActivityLogs();
    }

    if (result.stats) {
      updateStats(result.stats);
    }
  });
}

/**
 * Check connection status with background script
 */
function checkConnectionStatus() {
  chrome.runtime.sendMessage(
    { type: 'GET_CONNECTION_STATUS' },
    (response) => {
      if (response) {
        updateConnectionStatus(response.connected, response.hasToken);
      }
    }
  );
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  connectBtn.addEventListener('click', handleConnectClick);
  saveTokenBtn.addEventListener('click', handleSaveToken);
  clearLogsBtn.addEventListener('click', handleClearLogs);
  exportCsvBtn.addEventListener('click', handleExportCsv);

  // Update Google Maps stats periodically (every 10s to avoid spam)
  updateGoogleMapsStats();
  setInterval(updateGoogleMapsStats, 10000);
}

/**
 * Handle connect button click
 */
function handleConnectClick() {
  if (!hasJwtToken) {
    configCard.classList.remove('hidden');
    jwtTokenInput.focus();
    return;
  }

  if (isConnected) {
    // Disconnect
    chrome.runtime.sendMessage({ type: 'DISCONNECT' }, () => {
      updateConnectionStatus(false, true);
    });
  } else {
    // Reconnect
    chrome.runtime.sendMessage({ type: 'SET_JWT_TOKEN', token: null }, () => {
      checkConnectionStatus();
    });
  }
}

/**
 * Handle save JWT token
 */
function handleSaveToken() {
  const token = jwtTokenInput.value.trim();

  if (!token) {
    alert('Please enter a JWT token');
    return;
  }

  if (token === '••••••••••••••••') {
    alert('Token already saved');
    return;
  }

  // Save token and connect
  chrome.runtime.sendMessage(
    { type: 'SET_JWT_TOKEN', token: token },
    (response) => {
      if (response.success) {
        hasJwtToken = true;
        jwtTokenInput.value = '••••••••••••••••';
        configCard.classList.add('hidden');

        addActivityLog('info', 'JWT token saved successfully');

        // Wait for connection
        setTimeout(checkConnectionStatus, 1000);
      }
    }
  );
}

/**
 * Handle clear logs
 */
function handleClearLogs() {
  activityLogs = [];
  chrome.storage.local.set({ activity_logs: [] });
  renderActivityLogs();
}

/**
 * Handle background events
 */
function handleBackgroundEvent(message) {
  if (message.type !== 'BACKGROUND_EVENT') {
    return;
  }

  const { eventType, data } = message;

  switch (eventType) {
    case 'connected':
      updateConnectionStatus(true, true);
      addActivityLog('success', 'Connected to USAMKO server');
      break;

    case 'disconnected':
      updateConnectionStatus(false, true);
      addActivityLog('error', 'Disconnected from USAMKO server');
      break;

    case 'success':
      addActivityLog('success', data);
      break;

    case 'error':
      addActivityLog('error', data);
      break;

    case 'stats':
      updateStats(data);
      break;

    case 'status':
      // Connection status update
      break;
  }
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(connected, hasToken) {
  isConnected = connected;
  hasJwtToken = hasToken;

  if (connected) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    connectBtn.textContent = 'Disconnect';
    connectBtn.disabled = false;
  } else {
    statusDot.classList.remove('connected');
    statusText.textContent = hasToken ? 'Disconnected' : 'Not Configured';
    connectBtn.textContent = hasToken ? 'Connect' : 'Configure';
    connectBtn.disabled = false;
  }
}

/**
 * Update statistics
 */
function updateStats(stats) {
  totalAccountsEl.textContent = stats.total || 0;
  connectedAccountsEl.textContent = stats.connected || 0;

  // Save to storage
  chrome.storage.local.set({ stats: stats });
}

/**
 * Add activity log
 */
function addActivityLog(type, message) {
  const log = {
    type: type,
    message: message,
    timestamp: new Date().toISOString()
  };

  activityLogs.unshift(log);

  // Keep only last 20 logs
  if (activityLogs.length > 20) {
    activityLogs = activityLogs.slice(0, 20);
  }

  // Save to storage
  chrome.storage.local.set({ activity_logs: activityLogs });

  renderActivityLogs();
}

/**
 * Render activity logs
 */
function renderActivityLogs() {
  if (activityLogs.length === 0) {
    activityList.innerHTML = '<p class="empty-state">No activity yet</p>';
    return;
  }

  activityList.innerHTML = activityLogs.map(log => {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const typeClass = log.type === 'success' ? 'success' : log.type === 'error' ? 'error' : 'info';

    return `
      <div class="activity-item ${typeClass}">
        <div>
          <span class="message">${escapeHtml(log.message)}</span>
          <span class="time">${time}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Load activity logs from storage
 */
function loadActivityLogs() {
  chrome.storage.local.get(['activity_logs'], (result) => {
    if (result.activity_logs) {
      activityLogs = result.activity_logs;
      renderActivityLogs();
    }
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update Google Maps lead collection stats
 */
function updateGoogleMapsStats() {
  chrome.runtime.sendMessage({ type: 'GET_GOOGLE_MAPS_LEADS' }, (response) => {
    if (response && response.leads) {
      leadsCollectedEl.textContent = response.leads.length;

      if (response.leads.length === 0) {
        mapsStatusEl.textContent = 'Search on Google Maps to collect leads';
        exportCsvBtn.disabled = true;
      } else {
        mapsStatusEl.textContent = `${response.leads.length} leads ready to export`;
        exportCsvBtn.disabled = false;
      }
    }
  });
}

/**
 * Handle Export CSV button
 */
function handleExportCsv() {
  chrome.runtime.sendMessage({ type: 'EXPORT_GOOGLE_MAPS_CSV' }, (response) => {
    if (response && response.success) {
      addActivityLog('success', `Exported ${response.count} Google Maps leads to CSV`);
    } else {
      addActivityLog('error', 'Failed to export leads');
    }
  });
}

// Initialize popup
init();
