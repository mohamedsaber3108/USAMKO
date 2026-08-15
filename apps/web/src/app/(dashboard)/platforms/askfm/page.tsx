'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AskFMPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountsData = await api.getPlatforms({ platform: 'askfm' });
      const askfmAccounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.platforms || [];
      setAccounts(askfmAccounts);
    } catch (err) {
      console.error('Failed to load Ask.fm data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-4xl">❓</span>
            Ask.fm Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your Ask.fm account and questions
          </p>
        </div>
        <button
          onClick={() => router.push('/extension')}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Connect Account
        </button>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          📱 <strong>Note:</strong> Ask.fm requires session token capture via Chrome Extension.
          Install the USAMKO extension and log into Ask.fm to capture your session.
        </p>
        <button
          onClick={() => router.push('/extension')}
          className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 font-medium"
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
              <p className="text-gray-500 mb-4">No Ask.fm accounts connected</p>
              <button
                onClick={() => router.push('/extension')}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
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
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-xl">
                      ❓
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        @{account.accountName || account.username || 'askfm'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.platform} • {account.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/campaigns?platform=askfm')}
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
