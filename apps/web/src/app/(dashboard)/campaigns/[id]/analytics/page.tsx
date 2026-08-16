'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [platformBreakdown, setPlatformBreakdown] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadData();
  }, [campaignId, timeRange]);

  const loadData = async () => {
    try {
      const [campaignData, analyticsData] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignAnalytics(campaignId).catch(() => null),
      ]);

      setCampaign(campaignData);
      setAnalytics(analyticsData);
      setPlatformBreakdown(analyticsData?.platformBreakdown || []);
      setTimeSeriesData(analyticsData?.timeSeries || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      await api.generateCampaignReport(campaignId);
      alert('Report generated! Check the Reports page.');
      router.push('/reports');
    } catch (err: any) {
      alert('Failed to generate report: ' + err.message);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Campaign Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {campaign?.name || 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleExportReport}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            📄 Export Report
          </button>
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reach</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {(analytics?.totalReach || 0).toLocaleString()}
          </div>
          <div className="text-xs text-green-600 mt-1">
            +{analytics?.reachGrowth || 0}% vs last period
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Impressions</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {(analytics?.impressions || 0).toLocaleString()}
          </div>
          <div className="text-xs text-green-600 mt-1">
            +{analytics?.impressionsGrowth || 0}% vs last period
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Engagement Rate</div>
          <div className="text-3xl font-bold text-blue-600">
            {analytics?.engagementRate || 0}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(analytics?.totalEngagements || 0).toLocaleString()} total
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conversions</div>
          <div className="text-3xl font-bold text-purple-600">
            {analytics?.conversions || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {analytics?.conversionRate || 0}% conversion rate
          </div>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Types */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Engagement Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👍</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Likes</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {(analytics?.likes || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((analytics?.likes || 0) / (analytics?.totalEngagements || 1) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💬</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Comments</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {(analytics?.comments || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((analytics?.comments || 0) / (analytics?.totalEngagements || 1) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Shares</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {(analytics?.shares || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((analytics?.shares || 0) / (analytics?.totalEngagements || 1) * 100)}%
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🖱️</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Clicks</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {(analytics?.clicks || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {analytics?.ctr || 0}% CTR
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Performance
          </h3>
          <div className="space-y-3">
            {platformBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No platform data available
              </p>
            ) : (
              platformBreakdown.map((platform, idx) => (
                <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {platform.reach?.toLocaleString() || 0} reach
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Engagement</div>
                      <div className="font-semibold">{platform.engagementRate || 0}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Posts</div>
                      <div className="font-semibold">{platform.posts || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Conversions</div>
                      <div className="font-semibold">{platform.conversions || 0}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Over Time
        </h3>
        {timeSeriesData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No timeline data available for this period
          </p>
        ) : (
          <div className="space-y-2">
            {timeSeriesData.map((point, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 w-32">
                  {point.date}
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Reach: </span>
                    <span className="font-semibold">{point.reach?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Impressions: </span>
                    <span className="font-semibold">{point.impressions?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Engagement: </span>
                    <span className="font-semibold">{point.engagements || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Conversions: </span>
                    <span className="font-semibold">{point.conversions || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Performing Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Performing Posts
        </h3>
        <div className="space-y-3">
          {(analytics?.topPosts || []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No post data available
            </p>
          ) : (
            (analytics?.topPosts || []).map((post: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {post.platform} • {post.date}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {post.content}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-lg font-bold text-blue-600">
                    {post.engagementRate || 0}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {post.totalEngagements || 0} engagements
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          💡 AI Recommendations
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>• Best posting time: {analytics?.bestPostingTime || '9:00 AM - 11:00 AM'}</li>
          <li>• Top-performing content type: {analytics?.topContentType || 'Image posts'}</li>
          <li>• Recommended hashtags: {analytics?.recommendedHashtags?.join(', ') || 'None available'}</li>
          <li>• Engagement peak: {analytics?.engagementPeak || 'Weekday mornings'}</li>
        </ul>
      </div>
    </div>
  );
}
