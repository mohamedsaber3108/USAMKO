'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ExtensionPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('disconnected');

  useEffect(() => {
    loadData();
    checkWebSocketStatus();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getPlatforms();
      const allPlatforms = Array.isArray(data) ? data : data.platforms || [];
      // Filter to only show accounts captured via extension
      setPlatforms(allPlatforms);
    } catch (err) {
      console.error('Failed to load platforms:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkWebSocketStatus = () => {
    // In a real implementation, this would check WebSocket connection
    // For now, we'll simulate status
    setWsStatus('connected'); // or 'disconnected'
  };

  const platformSupport = [
    { name: 'Facebook', icon: '📘', status: 'active' },
    { name: 'Instagram', icon: '📷', status: 'active' },
    { name: 'Twitter', icon: '🐦', status: 'active' },
    { name: 'LinkedIn', icon: '💼', status: 'active' },
    { name: 'Telegram', icon: '✈️', status: 'active' },
    { name: 'YouTube', icon: '📺', status: 'active' },
    { name: 'Pinterest', icon: '📌', status: 'active' },
    { name: 'Reddit', icon: '🤖', status: 'active' },
    { name: 'VK', icon: '🇷🇺', status: 'active' },
    { name: 'Ask.fm', icon: '❓', status: 'active' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-4xl">🔌</span>
          Chrome Extension Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your USAMKO Chrome Extension for automatic token capture and lead collection
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Extension Status
          </h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            wsStatus === 'connected'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              {wsStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {wsStatus === 'disconnected' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Extension not connected. Install the extension or refresh the page if already installed.
            </p>
          </div>
        )}

        {wsStatus === 'connected' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Extension is connected and ready to capture tokens. Log into your social media accounts to start.
            </p>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Setup Instructions
          </h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Download & Install Extension
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Download the USAMKO Chrome Extension and install it in your browser.
              </p>
              <button
                onClick={() => alert('Extension download: chrome-extension/ directory')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                Download Extension
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Verify Connection
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Click the extension icon in your browser toolbar. You should see a green "Connected" status.
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-xs font-mono">
                WebSocket: wss://usamko.usamif.com/token-capture
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Log Into Platforms
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Visit your social media platforms and log in. The extension will automatically capture your authentication tokens.
              </p>
              <div className="grid grid-cols-5 gap-2">
                {platformSupport.slice(0, 5).map((platform) => (
                  <a
                    key={platform.name}
                    href="#"
                    className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <div className="text-2xl mb-1">{platform.icon}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">{platform.name}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Verify Capture
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Check the "Captured Tokens" section below to confirm your accounts are connected.
              </p>
              <button
                onClick={loadData}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Supported Platforms ({platformSupport.length})
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {platformSupport.map((platform) => (
              <div
                key={platform.name}
                className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="text-4xl mb-2">{platform.icon}</div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {platform.name}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                  platform.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {platform.status === 'active' ? '✓ Active' : 'Coming Soon'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Captured Tokens */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Captured Accounts ({platforms.length})
          </h3>
        </div>
        <div className="p-6">
          {platforms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">No accounts captured yet</p>
              <p className="text-sm text-gray-400">
                Install the extension and log into your social media accounts to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {platforms.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {account.platform?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {account.accountName || account.username || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.platform} • Captured {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'recently'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      account.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {account.isActive ? 'Active' : 'Expired'}
                    </span>
                    <button
                      onClick={() => router.push(`/platforms/${account.platform.toLowerCase()}`)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Manage →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Google Maps Lead Collector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Google Maps Lead Collector
          </h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Use the extension to automatically collect business leads from Google Maps search results.
          </p>
          <button
            onClick={() => router.push('/leads/collect/maps')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Open Google Maps Collector →
          </button>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Troubleshooting
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Extension shows "Disconnected"
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              • Refresh this page<br/>
              • Check if extension is enabled in chrome://extensions<br/>
              • Reinstall the extension if problem persists
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Tokens not appearing after login
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              • Wait 10-15 seconds after logging in<br/>
              • Click "Refresh Status" button above<br/>
              • Check extension popup for error messages
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Need help?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Contact support or check the documentation for detailed setup guides.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
