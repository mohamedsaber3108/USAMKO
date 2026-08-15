'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function LinkedInPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.getLinkedInProfiles(),
      api.getLinkedInStatistics(),
    ]).then(([profilesData, statsData]) => {
      setProfiles(Array.isArray(profilesData) ? profilesData : profilesData.profiles || []);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = async () => {
    if (!searchQuery) return;
    try {
      const result = await api.searchLinkedIn({ query: searchQuery });
      alert(JSON.stringify(result, null, 2));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleSendMessage = async (profileId: string) => {
    const message = prompt('Enter message:');
    if (!message) return;
    try {
      await api.sendLinkedInMessage({ profileId, message });
      alert('Message sent');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LinkedIn Automation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Search profiles, send messages, and automate outreach
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Profiles</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProfiles || profiles.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Messages Sent</p>
            <p className="text-2xl font-bold text-blue-600">{stats.messagesSent || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Connections</p>
            <p className="text-2xl font-bold text-green-600">{stats.connections || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Response Rate</p>
            <p className="text-2xl font-bold text-purple-600">{stats.responseRate || '0%'}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search LinkedIn</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter search query (e.g., 'Software Engineer at Microsoft')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {/* Profiles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Collected Profiles</h3>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{profile.name || profile.fullName}</p>
                <p className="text-sm text-gray-500">{profile.headline || profile.title}</p>
                <p className="text-xs text-gray-400">{profile.location}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendMessage(profile.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded"
                >
                  Message
                </button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && (
            <p className="text-center text-gray-500 py-8">No profiles collected yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
