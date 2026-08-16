/**
 * USAMKO Token Capture - Background Service Worker
 *
 * Manages WebSocket connection to USAMKO backend and handles token capture.
 * This is a Manifest V3 service worker that stays alive as long as needed.
 */

// Configuration
const CONFIG = {
  WEBSOCKET_URL: 'ws://localhost:3000/token-capture',
  PRODUCTION_URL: 'wss://usamko.usamif.com/token-capture',
  RECONNECT_INTERVAL: 5000,
  PING_INTERVAL: 30000,
};

// State
let websocket = null;
let reconnectTimer = null;
let pingTimer = null;
let jwtToken = null;
let isConnected = false;

/**
 * Initialize on extension install or update
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('USAMKO Token Capture installed');

  // Load saved JWT token
  chrome.storage.local.get(['jwt_token'], (result) => {
    if (result.jwt_token) {
      jwtToken = result.jwt_token;
      connectWebSocket();
    }
  });
});

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'TOKEN_CAPTURED':
      handleTokenCapture(message.data);
      sendResponse({ success: true });
      break;

    case 'SET_JWT_TOKEN':
      jwtToken = message.token;
      chrome.storage.local.set({ jwt_token: message.token });
      connectWebSocket();
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

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep channel open for async response
});

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  if (!jwtToken) {
    console.error('Cannot connect: JWT token not set');
    notifyPopup('error', 'JWT token not configured');
    return;
  }

  // Disconnect existing connection
  if (websocket) {
    websocket.close();
  }

  // Determine URL based on environment
  const isDevelopment = false; // Change to false for production
  const wsUrl = isDevelopment ? CONFIG.WEBSOCKET_URL : CONFIG.PRODUCTION_URL;
  const urlWithToken = `${wsUrl}?token=${jwtToken}`;

  console.log('Connecting to WebSocket:', wsUrl);

  try {
    websocket = new WebSocket(urlWithToken);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      isConnected = true;
      clearTimeout(reconnectTimer);

      // Start ping timer
      startPingTimer();

      // Notify popup
      notifyPopup('connected', 'Connected to USAMKO');

      // Update badge
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    };

    websocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);

      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      notifyPopup('error', 'WebSocket connection error');
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      isConnected = false;
      stopPingTimer();

      // Update badge
      chrome.action.setBadgeText({ text: '✗' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });

      // Notify popup
      notifyPopup('disconnected', 'Disconnected from USAMKO');

      // Auto-reconnect
      scheduleReconnect();
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
 * Schedule reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  reconnectTimer = setTimeout(() => {
    console.log('Attempting to reconnect...');
    connectWebSocket();
  }, CONFIG.RECONNECT_INTERVAL);
}

/**
 * Start ping timer to keep connection alive
 */
function startPingTimer() {
  stopPingTimer();

  pingTimer = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      sendWebSocketMessage('ping', {});
    }
  }, CONFIG.PING_INTERVAL);
}

/**
 * Stop ping timer
 */
function stopPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/**
 * Send message to WebSocket server
 */
function sendWebSocketMessage(event, data) {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not connected');
    return false;
  }

  const message = JSON.stringify({ event, data });
  websocket.send(message);
  return true;
}

/**
 * Handle WebSocket messages from server
 */
function handleWebSocketMessage(message) {
  console.log('Handling WebSocket message:', message);

  switch (message.event) {
    case 'connection_status':
      console.log('Connection status:', message.data);
      notifyPopup('status', message.data);
      break;

    case 'token_saved':
      console.log('Token saved successfully:', message.data);
      notifyPopup('success', `Token saved for ${message.data.platform}`);

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Token Captured',
        message: `${message.data.platform} account connected successfully`,
      });
      break;

    case 'token_error':
      console.error('Token save error:', message.data);
      notifyPopup('error', `Failed to save token: ${message.data.error}`);
      break;

    case 'connection_stats':
      console.log('Connection stats:', message.data);
      notifyPopup('stats', message.data);
      break;

    case 'pong':
      // Ping response received
      break;

    default:
      console.log('Unknown message event:', message.event);
  }
}

/**
 * Handle token capture from content scripts
 */
function handleTokenCapture(data) {
  console.log('Token captured:', data.platform);

  if (!isConnected) {
    console.error('Cannot send token: WebSocket not connected');
    notifyPopup('error', 'Not connected to USAMKO server');
    return;
  }

  // Send to backend via WebSocket
  const success = sendWebSocketMessage('capture_token', {
    platform: data.platform,
    accountId: data.accountId,
    accountName: data.accountName,
    username: data.username,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    metadata: data.metadata,
  });

  if (success) {
    console.log('Token sent to backend');
  } else {
    console.error('Failed to send token to backend');
  }
}

/**
 * Notify popup of events
 */
function notifyPopup(type, data) {
  // Send message to popup if it's open
  chrome.runtime.sendMessage({
    type: 'BACKGROUND_EVENT',
    eventType: type,
    data: data,
  }).catch(() => {
    // Popup not open, ignore error
  });
}

/**
 * Keep service worker alive
 */
chrome.alarms.create('keep-alive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    // Service worker will stay alive
    console.log('Keep-alive ping');
  }
});
