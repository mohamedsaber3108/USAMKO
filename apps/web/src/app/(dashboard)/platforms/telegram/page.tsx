'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function TelegramPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountsData = await api.getPlatforms({ platform: 'telegram' });
      const telegramAccounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.platforms || [];

      setAccounts(telegramAccounts);
      if (telegramAccounts.length > 0) {
        setSelectedAccount(telegramAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load Telegram data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedAccount || !recipient || !message) {
      alert('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      await api.sendPlatformMessage(selectedAccount, {
        recipient,
        message,
      });
      alert('Message sent successfully!');
      setRecipient('');
      setMessage('');
      setShowMessageComposer(false);
    } catch (err: any) {
      alert('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-4xl">✈️</span>
            Telegram Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your Telegram accounts, channels, and groups
          </p>
        </div>
        <button
          onClick={() => alert('Telegram connection: Use Chrome Extension to capture session')}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Connect Account
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          📱 <strong>Note:</strong> Telegram requires session token capture via Chrome Extension.
          Install the USAMKO extension and log into Telegram Web to capture your session.
        </p>
        <button
          onClick={() => router.push('/extension')}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
        >
          → Go to Extension Setup
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Accounts ({accounts.length})
          </h3>
        </div>
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No Telegram accounts connected</p>
              <button
                onClick={() => router.push('/extension')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Setup Chrome Extension
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                      ✈️
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {account.accountName || account.username || 'Telegram Account'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.platform} • {account.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedAccount(account.id);
                        setShowMessageComposer(true);
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                    >
                      Send Message
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Disconnect?')) {
                          await api.deletePlatform(account.id);
                          loadData();
                        }
                      }}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Send Message
            </h3>
            <button
              onClick={() => setShowMessageComposer(!showMessageComposer)}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              {showMessageComposer ? 'Hide' : 'Show'}
            </button>
          </div>

          {showMessageComposer && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName || account.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To (Username, Phone, or Chat ID)
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="@username or +1234567890"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={6}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !recipient || !message}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  onClick={() => setShowMessageComposer(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/campaigns?platform=telegram')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Create Campaign
            </button>
            <button
              onClick={() => router.push('/extension')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Extension Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
