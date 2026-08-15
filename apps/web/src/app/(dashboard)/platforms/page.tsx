'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function PlatformsPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = () => {
    api.getPlatforms()
      .then(data => {
        setPlatforms(Array.isArray(data) ? data : data.platforms || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Disconnect this platform?')) return;
    try {
      await api.deletePlatform(id);
      alert('Platform disconnected');
      loadPlatforms();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleRefreshToken = async (id: string) => {
    try {
      await api.refreshPlatformToken(id);
      alert('Token refreshed');
      loadPlatforms();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleViewProfile = async (id: string) => {
    try {
      const profile = await api.getPlatformProfile(id);
      alert(JSON.stringify(profile, null, 2));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your connected social media platforms
          </p>
        </div>
        <button
          onClick={loadPlatforms}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Accounts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{platforms.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{platforms.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Platforms</p>
          <p className="text-2xl font-bold text-blue-600">{new Set(platforms.map(p => p.platform)).size}</p>
        </div>
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div key={platform.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {platform.platform}
                </h3>
                <p className="text-sm text-gray-500">{platform.accountName || platform.username || 'Unknown'}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                platform.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {platform.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
              {platform.email && <p>Email: {platform.email}</p>}
              {platform.phone && <p>Phone: {platform.phone}</p>}
              {platform.accountId && <p className="truncate">ID: {platform.accountId}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleViewProfile(platform.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded"
              >
                View
              </button>
              <button
                onClick={() => handleRefreshToken(platform.id)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => handleDisconnect(platform.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded"
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No platforms connected yet</p>
          <p className="text-sm text-gray-400">Use the Chrome Extension or OAuth flow to connect platforms</p>
        </div>
      )}
    </div>
  );
}
