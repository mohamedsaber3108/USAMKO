'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function YouTubePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountsData = await api.getPlatforms({ platform: 'youtube' });
      const youtubeAccounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.platforms || [];
      setAccounts(youtubeAccounts);
    } catch (err) {
      console.error('Failed to load YouTube data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-4xl">📺</span>
            YouTube Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your YouTube channels and videos
          </p>
        </div>
        <button
          onClick={() => alert('OAuth integration: Will redirect to Google OAuth for YouTube')}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Connect Channel
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Channels ({accounts.length})
          </h3>
        </div>
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No YouTube channels connected</p>
              <button
                onClick={() => alert('OAuth integration')}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Connect Your First Channel
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
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl">
                      ▶️
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {account.accountName || account.username || 'YouTube Channel'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.platform} • {account.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => api.refreshPlatformToken(account.id)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Refresh
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/campaigns?platform=youtube')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Create Campaign
            </button>
            <button
              onClick={() => router.push('/analytics?platform=youtube')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              View Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
