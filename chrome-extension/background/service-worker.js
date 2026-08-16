/**
 * USAMKO Token Capture - Background Service Worker
 */

// Configuration
const CONFIG = {
  WEBSOCKET_URL: 'ws://localhost:3000/token-capture',
  PRODUCTION_URL: 'wss://usamko.usamif.com/token-capture',
  API_URL: 'https://usamko.usamif.com',
  RECONNECT_INTERVAL: 5000,
  PING_INTERVAL: 30000,
};

// State
let websocket = null;
let reconnectTimer = null;
let pingTimer = null;
let jwtToken = null;
let refreshToken = null;
let isConnected = false;
let googleMapsLeads = [];

/**
 * Initialize on extension install or update
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('USAMKO Token Capture installed');
  loadTokensFromStorage();
});

/**
 * Also load tokens on service worker startup (wake from idle)
 */
chrome.storage.local.get(['jwt_token', 'refresh_token'], (result) => {
  if (result.jwt_token) {
    jwtToken = result.jwt_token;
    refreshToken = result.refresh_token || null;
    connectWebSocket();
  }
});

/**
 * Load tokens from storage
 */
function loadTokensFromStorage() {
  chrome.storage.local.get(['jwt_token', 'refresh_token'], (result) => {
    if (result.jwt_token) {
      jwtToken = result.jwt_token;
      refreshToken = result.refresh_token || null;
      connectWebSocket();
    }
  });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  switch (message.type) {
    case 'TOKEN_CAPTURED':
      handleTokenCapture(message.data);
      sendResponse({ success: true });
      break;

    case 'SET_JWT_TOKEN':
      if (message.token) {
        // Strip surrounding quotes (users copy from console with quotes)
        jwtToken = message.token.replace(/^['"]|['"]$/g, '');
        chrome.storage.local.set({ jwt_token: jwtToken });
        if (message.refreshToken) {
          refreshToken = message.refreshToken;
          chrome.storage.local.set({ refresh_token: message.refreshToken });
        }
        connectWebSocket();
      }
      sendResponse({ success: true });
      break;

    case 'GET_CONNECTION_STATUS':
      sendResponse({
        connected: isConnected,
        hasToken: !!jwtToken,
      });
      break;

    case 'DISCONNECT':
      disconnectWebSocket();
      sendResponse({ success: true });
      break;

    case 'GET_GOOGLE_MAPS_LEADS':
      sendResponse({ leads: googleMapsLeads });
      break;

    case 'ADD_GOOGLE_MAPS_LEAD':
      if (message.lead) {
        googleMapsLeads.push(message.lead);
        chrome.storage.local.set({ google_maps_leads: googleMapsLeads });
      }
      sendResponse({ success: true, count: googleMapsLeads.length });
      break;

    case 'EXPORT_GOOGLE_MAPS_CSV':
      exportLeadsToCsv();
      sendResponse({ success: true, count: googleMapsLeads.length });
      break;

    case 'CLEAR_GOOGLE_MAPS_LEADS':
      googleMapsLeads = [];
      chrome.storage.local.set({ google_maps_leads: [] });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true;
});

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  if (!jwtToken) {
    console.error('Cannot connect: JWT token not set');
    return;
  }

  if (websocket) {
    websocket.close();
  }

  const isDevelopment = false;
  const wsUrl = isDevelopment ? CONFIG.WEBSOCKET_URL : CONFIG.PRODUCTION_URL;
  const urlWithToken = `${wsUrl}?token=${jwtToken}`;

  console.log('Connecting to WebSocket:', wsUrl);

  try {
    websocket = new WebSocket(urlWithToken);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      isConnected = true;
      clearTimeout(reconnectTimer);
      startPingTimer();
      notifyPopup('connected', 'Connected to USAMKO');
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      isConnected = false;
      stopPingTimer();
      chrome.action.setBadgeText({ text: '' });
      notifyPopup('disconnected', 'Disconnected');

      // If closed due to auth failure, try refresh
      if (event.code === 1008 && refreshToken) {
        refreshAccessToken();
      } else {
        scheduleReconnect();
      }
    };
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    scheduleReconnect();
  }
}

/**
 * Disconnect WebSocket
 */
function disconnectWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  stopPingTimer();
  clearTimeout(reconnectTimer);
  isConnected = false;
}

/**
 * Schedule reconnection
 */
function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (jwtToken) {
      console.log('Attempting to reconnect...');
      connectWebSocket();
    }
  }, CONFIG.RECONNECT_INTERVAL);
}

/**
 * Refresh JWT token
 */
async function refreshAccessToken() {
  if (!refreshToken) return;

  try {
    const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      jwtToken = data.accessToken;
      if (data.refreshToken) refreshToken = data.refreshToken;

      chrome.storage.local.set({
        jwt_token: jwtToken,
        refresh_token: refreshToken,
      });

      console.log('Token refreshed successfully');
      connectWebSocket();
    } else {
      console.error('Token refresh failed:', response.status);
      jwtToken = null;
      refreshToken = null;
      chrome.storage.local.remove(['jwt_token', 'refresh_token']);
      notifyPopup('error', 'Session expired. Please re-enter token.');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    scheduleReconnect();
  }
}

/**
 * Ping timer to keep connection alive
 */
function startPingTimer() {
  stopPingTimer();
  pingTimer = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ event: 'ping', data: {} }));
    }
  }, CONFIG.PING_INTERVAL);
}

function stopPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/**
 * Handle WebSocket messages from server
 */
function handleWebSocketMessage(message) {
  switch (message.event) {
    case 'connection_status':
      notifyPopup('status', message.data);
      break;
    case 'token_saved':
      notifyPopup('success', `Token saved for ${message.data.platform}`);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Token Captured',
        message: `${message.data.platform} account connected`,
      });
      break;
    case 'token_error':
      notifyPopup('error', `Failed: ${message.data.error}`);
      break;
    case 'connection_stats':
      notifyPopup('stats', message.data);
      break;
    case 'pong':
      break;
  }
}

/**
 * Handle token capture from content scripts
 */
function handleTokenCapture(data) {
  if (!isConnected) {
    console.error('Cannot send token: not connected');
    notifyPopup('error', 'Not connected to server');
    return;
  }

  websocket.send(JSON.stringify({
    event: 'capture_token',
    data: {
      platform: data.platform,
      accountId: data.accountId,
      accountName: data.accountName,
      username: data.username,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
    },
  }));
}

/**
 * Export Google Maps leads to CSV
 */
function exportLeadsToCsv() {
  if (googleMapsLeads.length === 0) return;

  const headers = Object.keys(googleMapsLeads[0]);
  const csv = [
    headers.join(','),
    ...googleMapsLeads.map(lead =>
      headers.map(h => `"${(lead[h] || '').toString().replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: `usamko-leads-${new Date().toISOString().split('T')[0]}.csv`,
    saveAs: true,
  });
}

/**
 * Notify popup of events
 */
function notifyPopup(type, data) {
  chrome.runtime.sendMessage({
    type: 'BACKGROUND_EVENT',
    eventType: type,
    data: data,
  }).catch(() => {});
}

/**
 * Keep service worker alive
 */
chrome.alarms.create('keep-alive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log('Keep-alive ping');
  }
});
