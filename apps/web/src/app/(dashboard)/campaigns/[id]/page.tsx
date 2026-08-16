'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    try {
      const [campaignData, statsData, analyticsData, executionsData] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignStats(campaignId).catch(() => null),
        api.getCampaignAnalytics(campaignId).catch(() => null),
        api.getCampaignExecutions(campaignId).catch(() => []),
      ]);

      setCampaign(campaignData);
      setStats(statsData);
      setAnalytics(analyticsData);
      setExecutions(Array.isArray(executionsData) ? executionsData : executionsData.executions || []);
    } catch (err) {
      console.error('Failed to load campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!confirm('Start this campaign?')) return;
    try {
      await api.executeCampaign(campaignId);
      alert('Campaign started! View progress in the monitor.');
      router.push(`/campaigns/${campaignId}/monitor`);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleEdit = () => {
    router.push(`/campaigns/${campaignId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await api.deleteCampaign(campaignId);
      alert('Campaign deleted');
      router.push('/campaigns');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleClone = async () => {
    const name = prompt('Enter name for cloned campaign:', campaign.name + ' (Copy)');
    if (!name) return;
    try {
      await api.cloneCampaign(campaignId, { name });
      alert('Campaign cloned successfully!');
      router.push('/campaigns');
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

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {campaign.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {campaign.description || 'No description'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/monitor`)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Monitor
          </button>
          <button
            onClick={handleExecute}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            ▶ Execute
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {campaign.status || 'Draft'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Executions</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalExecutions || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          <div className="text-2xl font-bold text-green-600">
            {stats?.successRate || 0}%
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Reach</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats?.totalReach?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Campaign Details
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {campaign.type || 'Standard'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Target Platforms</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {(campaign.platforms || ['LinkedIn']).map((platform: string) => (
                  <span
                    key={platform}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Created</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {campaign.createdAt ? new Date(campaign.createdAt).toLocaleString() : 'Unknown'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
              <div className="font-medium text-gray-900 dark:text-white">
                {campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleString() : 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* Content Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Content Preview
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Message Template</div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                {campaign.content || campaign.messageTemplate || 'No content configured'}
              </div>
            </div>
            {campaign.mediaUrl && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Media</div>
                <img
                  src={campaign.mediaUrl}
                  alt="Campaign media"
                  className="w-full rounded border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Analytics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.impressions || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Impressions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.clicks || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Clicks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.conversions || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Conversions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.engagementRate || 0}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Engagement</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Executions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Executions ({executions.length})
          </h3>
        </div>
        <div className="p-6">
          {executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No executions yet. Click "Execute" to start this campaign.
            </div>
          ) : (
            <div className="space-y-3">
              {executions.slice(0, 10).map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Execution #{execution.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      Started: {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        execution.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : execution.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {execution.status || 'Pending'}
                    </span>
                    <button
                      onClick={() => router.push(`/campaigns/${campaignId}/monitor`)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Campaign Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleEdit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            ✏️ Edit Campaign
          </button>
          <button
            onClick={handleClone}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            📋 Clone Campaign
          </button>
          <button
            onClick={() => router.push(`/campaigns/${campaignId}/analytics`)}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            📊 View Analytics
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            🗑️ Delete Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
