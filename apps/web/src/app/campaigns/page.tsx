'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  config: {
    platforms: string[];
  };
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'running' | 'completed'>('all');

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockCampaigns: Campaign[] = [
        {
          id: '1',
          name: 'Summer Product Launch',
          type: 'bulk_post',
          status: 'completed',
          createdAt: new Date().toISOString(),
          config: { platforms: ['facebook', 'instagram', 'twitter'] },
        },
        {
          id: '2',
          name: 'Follow Campaign - Tech Influencers',
          type: 'follow',
          status: 'running',
          createdAt: new Date().toISOString(),
          config: { platforms: ['instagram', 'twitter'] },
        },
        {
          id: '3',
          name: 'Weekly Newsletter Promotion',
          type: 'post',
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          config: { platforms: ['linkedin'] },
        },
      ];

      const filtered = filter === 'all'
        ? mockCampaigns
        : mockCampaigns.filter(c => c.status === filter);

      setCampaigns(filtered);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      running: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post: 'Single Post',
      bulk_post: 'Bulk Post',
      follow: 'Follow Campaign',
      like: 'Like Campaign',
      comment: 'Comment Campaign',
      message: 'Message Campaign',
      bulk_message: 'Bulk Message',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Campaigns
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and track your marketing campaigns
              </p>
            </div>
            <Link
              href="/campaigns/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'draft', 'running', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No campaigns yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new campaign
            </p>
            <Link
              href="/campaigns/create"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                      campaign.status,
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {getTypeLabel(campaign.type)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {campaign.config.platforms.map(platform => (
                    <span
                      key={platform}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                    >
                      {platform}
                    </span>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Created {new Date(campaign.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
