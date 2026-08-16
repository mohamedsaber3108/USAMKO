'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignEditPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('standard');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [status, setStatus] = useState('draft');

  const availablePlatforms = [
    'LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'Telegram',
    'YouTube', 'Pinterest', 'Reddit', 'VK', 'AskFM'
  ];

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const campaign = await api.getCampaign(campaignId);
      setName(campaign.name || '');
      setDescription(campaign.description || '');
      setType(campaign.type || 'standard');
      setPlatforms(campaign.platforms || ['LinkedIn']);
      setContent(campaign.content || campaign.messageTemplate || '');
      setMediaUrl(campaign.mediaUrl || '');
      setScheduledFor(campaign.scheduledFor || '');
      setStatus(campaign.status || 'draft');
    } catch (err) {
      console.error('Failed to load campaign:', err);
      alert('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    if (platforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setSaving(true);
    try {
      await api.updateCampaign(campaignId, {
        name,
        description,
        type,
        platforms,
        content,
        mediaUrl: mediaUrl || undefined,
        scheduledFor: scheduledFor || undefined,
        status,
      });

      alert('Campaign updated successfully!');
      router.push(`/campaigns/${campaignId}`);
    } catch (err: any) {
      alert('Failed to update campaign: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleGenerateAI = async () => {
    const topic = prompt('Enter topic for AI generation:');
    if (!topic) return;

    try {
      const result = await api.generatePost({
        topic,
        platform: platforms[0] || 'LinkedIn',
        tone: 'professional',
        includeHashtags: true,
      });
      setContent(result.content || result.post || '');
    } catch (err: any) {
      alert('AI generation failed: ' + err.message);
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
            Edit Campaign
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Update campaign settings and content
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="e.g., Summer Product Launch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="What is this campaign about?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Campaign Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="standard">Standard</option>
                    <option value="automated">Automated</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="drip">Drip Campaign</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Campaign Content
              </h3>
              <button
                onClick={handleGenerateAI}
                className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
              >
                ✨ Generate with AI
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message / Post Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                  placeholder="Enter your campaign message..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Character count: {content.length}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Media URL (optional)
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {mediaUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Media Preview
                  </label>
                  <img
                    src={mediaUrl}
                    alt="Media preview"
                    className="w-full max-h-64 object-cover rounded border border-gray-300 dark:border-gray-600"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Schedule (Optional)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule For
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to execute immediately
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target Platforms */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Target Platforms <span className="text-red-500">*</span>
            </h3>
            <div className="space-y-2">
              {availablePlatforms.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {platform}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Selected: {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/campaigns/${campaignId}/monitor`)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                📊 View Monitor
              </button>
              <button
                onClick={() => router.push(`/campaigns/${campaignId}/analytics`)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                📈 View Analytics
              </button>
              <button
                onClick={() => router.push('/media')}
                className="w-full text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                🖼️ Media Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
