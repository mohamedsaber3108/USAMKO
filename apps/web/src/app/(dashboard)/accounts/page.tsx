'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface PlatformAccount {
  id: string;
  platform: string;
  username: string;
  status: 'active' | 'expired' | 'error';
  lastSync: string;
  createdAt: string;
}

const SUPPORTED_PLATFORMS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    description: 'Connect your LinkedIn account for professional networking',
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    connectionMethods: ['browser_session', 'chrome_extension'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    description: 'Connect your Facebook account for social engagement',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    connectionMethods: ['chrome_extension'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    description: 'Connect your Instagram account for visual content',
    color: 'bg-pink-600',
    hoverColor: 'hover:bg-pink-700',
    connectionMethods: ['chrome_extension'],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: '🐦',
    description: 'Connect your Twitter account for microblogging',
    color: 'bg-sky-500',
    hoverColor: 'hover:bg-sky-600',
    connectionMethods: ['chrome_extension'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    description: 'Connect your Telegram account for messaging',
    color: 'bg-blue-400',
    hoverColor: 'hover:bg-blue-500',
    connectionMethods: ['api_token'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🎥',
    description: 'Connect your YouTube channel',
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    connectionMethods: ['chrome_extension'],
  },
];

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
  const [connectionMethod, setConnectionMethod] = useState<string>('');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await api.getPlatforms();
      setAccounts(data || []);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConnectionModal = (platform: any) => {
    setSelectedPlatform(platform);
    setConnectionMethod(platform.connectionMethods[0]);
    setShowConnectionModal(true);
  };

  const closeConnectionModal = () => {
    setShowConnectionModal(false);
    setSelectedPlatform(null);
    setConnectionMethod('');
    setApiToken('');
  };

  const handleConnect = async () => {
    if (!selectedPlatform) return;

    try {
      setConnectingPlatform(selectedPlatform.id);

      if (connectionMethod === 'api_token') {
        // Direct API token connection (Telegram)
        await api.createPlatform({
          platform: selectedPlatform.id,
          credentials: { token: apiToken },
        });
        alert(`${selectedPlatform.name} connected successfully!`);
      } else if (connectionMethod === 'chrome_extension') {
        // Chrome Extension connection
        alert(
          `To connect ${selectedPlatform.name}:\n\n` +
          `1. Install the USAMKO Chrome Extension\n` +
          `2. Open ${selectedPlatform.name} in your browser\n` +
          `3. Log in to your account\n` +
          `4. Click the USAMKO extension icon\n` +
          `5. Select "${selectedPlatform.name}"\n` +
          `6. The account will appear here automatically`
        );
      } else if (connectionMethod === 'browser_session') {
        // Browser session (LinkedIn)
        router.push(`/accounts/connect/${selectedPlatform.id}`);
      }

      closeConnectionModal();
      await loadAccounts();
    } catch (error) {
      console.error('Connection failed:', error);
      alert(`Failed to connect ${selectedPlatform.name}: ${error.message}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string, platformName: string) => {
    if (!confirm(`Are you sure you want to disconnect this ${platformName} account?`)) {
      return;
    }

    try {
      await api.deletePlatform(accountId);
      alert(`${platformName} account disconnected`);
      await loadAccounts();
    } catch (error) {
      console.error('Disconnect failed:', error);
      alert(`Failed to disconnect: ${error.message}`);
    }
  };

  const handleReconnect = async (accountId: string) => {
    try {
      await api.refreshPlatformToken(accountId);
      alert('Account reconnected successfully!');
      await loadAccounts();
    } catch (error) {
      console.error('Reconnect failed:', error);
      alert(`Failed to reconnect: ${error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'expired':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlatformInfo = (platform: string) => {
    return SUPPORTED_PLATFORMS.find((p) => p.id === platform.toLowerCase()) || {
      name: platform,
      icon: '🔗',
      color: 'bg-gray-600',
    };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Platform Accounts</h1>
        <p className="text-gray-600">
          Connect and manage your social media and platform accounts
        </p>
      </div>

      {/* Chrome Extension Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-2xl mr-3">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Chrome Extension Required
            </h3>
            <p className="text-sm text-blue-800 mb-2">
              To connect most platforms, you'll need the USAMKO Chrome Extension.
            </p>
            <button
              onClick={() => alert('Extension download link: https://github.com/mohamedsaber3108/USAMKO/tree/main/chrome-extension')}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Download Extension
            </button>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => {
              const platformInfo = getPlatformInfo(account.platform);
              return (
                <div
                  key={account.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{platformInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold">{platformInfo.name}</h3>
                        <p className="text-sm text-gray-600">@{account.username}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(account.status)}`}
                    >
                      {account.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Last sync:{' '}
                    {account.lastSync
                      ? new Date(account.lastSync).toLocaleString()
                      : 'Never'}
                  </div>

                  <div className="flex gap-2">
                    {account.status === 'expired' || account.status === 'error' ? (
                      <button
                        onClick={() => handleReconnect(account.id)}
                        className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                      >
                        Reconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/accounts/${account.id}`)}
                        className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        Manage
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(account.id, platformInfo.name)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {accounts.length > 0 ? 'Add More Accounts' : 'Connect Your First Account'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUPPORTED_PLATFORMS.map((platform) => {
            const isConnected = accounts.some(
              (acc) => acc.platform.toLowerCase() === platform.id
            );
            return (
              <div
                key={platform.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <span className="text-4xl mr-3">{platform.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{platform.name}</h3>
                    {isConnected && (
                      <span className="text-xs text-green-600">✓ Connected</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{platform.description}</p>
                <button
                  onClick={() => openConnectionModal(platform)}
                  disabled={connectingPlatform === platform.id}
                  className={`w-full px-4 py-2 text-white rounded ${platform.color} ${platform.hoverColor} disabled:opacity-50`}
                >
                  {connectingPlatform === platform.id
                    ? 'Connecting...'
                    : isConnected
                    ? 'Add Another'
                    : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && selectedPlatform && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">
              Connect {selectedPlatform.name}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Connection Method
              </label>
              <select
                value={connectionMethod}
                onChange={(e) => setConnectionMethod(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                {selectedPlatform.connectionMethods.map((method: string) => (
                  <option key={method} value={method}>
                    {method === 'api_token'
                      ? 'API Token'
                      : method === 'chrome_extension'
                      ? 'Chrome Extension'
                      : method === 'browser_session'
                      ? 'Browser Session'
                      : method}
                  </option>
                ))}
              </select>
            </div>

            {connectionMethod === 'api_token' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  API Token / Bot Token
                </label>
                <input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your API token"
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For Telegram: Get your bot token from @BotFather
                </p>
              </div>
            )}

            {connectionMethod === 'chrome_extension' && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Steps to connect:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Install USAMKO Chrome Extension</li>
                  <li>Open {selectedPlatform.name} and log in</li>
                  <li>Click the extension icon</li>
                  <li>Select "{selectedPlatform.name}"</li>
                  <li>Account will appear automatically</li>
                </ol>
              </div>
            )}

            {connectionMethod === 'browser_session' && (
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-700">
                  You'll be redirected to a page where you can authenticate with{' '}
                  {selectedPlatform.name} in a controlled browser session.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeConnectionModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connectionMethod === 'api_token' && !apiToken}
                className={`flex-1 px-4 py-2 text-white rounded ${selectedPlatform.color} ${selectedPlatform.hoverColor} disabled:opacity-50`}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      )}
    </div>
  );
}
