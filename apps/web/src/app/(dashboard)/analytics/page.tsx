'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [overview, setOverview] = useState<any>(null);
  const [platformStats, setPlatformStats] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = { dateRange };
      const [overviewData, engagementData, growthData] = await Promise.all([
        api.getAnalyticsOverview(params),
        api.getEngagementStats(params),
        api.getGrowthStats(params),
      ]);

      setOverview(overviewData);
      setEngagement(engagementData);
      setGrowth(growthData);

      // Load platform-specific stats
      const platforms = ['facebook', 'instagram', 'linkedin', 'twitter'];
      const platformData = await Promise.all(
        platforms.map(p => api.getPlatformAnalytics(p).catch(() => null))
      );
      setPlatformStats(platformData.filter(Boolean));
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.exportAnalytics({ dateRange });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dateRange}.csv`;
      a.click();
    } catch (err: any) {
      alert('Export failed: ' + err.message);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your performance across all platforms
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Posts"
          value={overview?.totalPosts || 0}
          change={overview?.postsChange || '+0%'}
          icon="📝"
        />
        <StatCard
          title="Total Engagement"
          value={overview?.totalEngagement || 0}
          change={overview?.engagementChange || '+0%'}
          icon="❤️"
        />
        <StatCard
          title="Reach"
          value={overview?.totalReach || 0}
          change={overview?.reachChange || '+0%'}
          icon="👁️"
        />
        <StatCard
          title="Followers"
          value={overview?.totalFollowers || 0}
          change={overview?.followersChange || '+0%'}
          icon="👥"
        />
      </div>

      {/* Engagement Stats */}
      {engagement && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Likes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{engagement.likes?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{engagement.comments?.toLocaleString() || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Shares</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{engagement.shares?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Performance</h3>
        <div className="space-y-3">
          {platformStats.map((stat, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{stat.platform}</p>
                <p className="text-sm text-gray-500">{stat.posts || 0} posts</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {stat.engagement?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500">engagement</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Trends */}
      {growth && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Growth</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New Followers</p>
              <p className="text-2xl font-bold text-green-600">+{growth.newFollowers || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</p>
              <p className="text-2xl font-bold text-blue-600">{growth.growthRate || '0%'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, change, icon }: any) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
    </div>
  );
}
