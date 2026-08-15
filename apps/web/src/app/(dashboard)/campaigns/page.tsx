'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'COMPLETED' | 'PAUSED'>('all');

  useEffect(() => {
    loadCampaigns();
  }, [filter]);

  const loadCampaigns = () => {
    const params = filter !== 'all' ? { status: filter } : undefined;
    api.getCampaigns(params)
      .then(data => {
        setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleExecute = async (id: string) => {
    try {
      await api.executeCampaign(id);
      alert('Campaign started');
      loadCampaigns();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.pauseCampaign(id);
      alert('Campaign paused');
      loadCampaigns();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api.deleteCampaign(id);
      alert('Campaign deleted');
      loadCampaigns();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your marketing automation campaigns
          </p>
        </div>
        <Link
          href="/campaigns/create"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Create Campaign
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'ACTIVE', 'COMPLETED', 'PAUSED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {campaign.name}
                </h3>
                <p className="text-sm text-gray-500">{campaign.type}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {campaign.status}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {campaign.description || 'No description'}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{campaign.platforms?.join(', ') || 'No platforms'}</span>
            </div>

            <div className="flex gap-2">
              {campaign.status !== 'ACTIVE' && (
                <button
                  onClick={() => handleExecute(campaign.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded"
                >
                  Start
                </button>
              )}
              {campaign.status === 'ACTIVE' && (
                <button
                  onClick={() => handlePause(campaign.id)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-3 rounded"
                >
                  Pause
                </button>
              )}
              <Link
                href={`/campaigns/${campaign.id}/monitor`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded text-center"
              >
                Monitor
              </Link>
              <button
                onClick={() => handleDelete(campaign.id)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No campaigns yet</p>
          <Link
            href="/campaigns/create"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Create Your First Campaign
          </Link>
        </div>
      )}
    </div>
  );
}
