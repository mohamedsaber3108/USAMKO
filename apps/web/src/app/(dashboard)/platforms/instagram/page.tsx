'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function InstagramPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostComposer, setShowPostComposer] = useState(false);

  // Post composer state
  const [selectedAccount, setSelectedAccount] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accountsData, analyticsData] = await Promise.all([
        api.getPlatforms({ platform: 'instagram' }),
        api.getAnalyticsPlatforms('instagram').catch(() => null),
      ]);

      const igAccounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.platforms || [];

      setAccounts(igAccounts);
      setAnalytics(analyticsData);

      if (igAccounts.length > 0) {
        setSelectedAccount(igAccounts[0].id);
        loadPosts(igAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load Instagram data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (accountId: string) => {
    try {
      const data = await api.getPlatformPosts(accountId);
      setPosts(Array.isArray(data) ? data : data.posts || []);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const handleConnectAccount = () => {
    alert('OAuth integration: Will redirect to Instagram OAuth flow');
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this Instagram account?')) return;
    try {
      await api.deletePlatform(accountId);
      alert('Account disconnected');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    try {
      await api.refreshPlatformToken(accountId);
      alert('Token refreshed successfully');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handlePost = async () => {
    if (!selectedAccount || !content || !mediaUrl) {
      alert('Instagram requires both content and an image URL');
      return;
    }

    setPosting(true);
    try {
      const postData: any = { content, mediaUrl };
      if (scheduledFor) postData.scheduledFor = new Date(scheduledFor).toISOString();

      await api.postToPlatform(selectedAccount, postData);
      alert('Posted to Instagram successfully!');
      setContent('');
      setMediaUrl('');
      setScheduledFor('');
      setShowPostComposer(false);
      loadPosts(selectedAccount);
    } catch (err: any) {
      alert('Failed to post: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleGenerateAI = async () => {
    const topic = prompt('Enter topic for AI generation:');
    if (!topic) return;

    try {
      const result = await api.generatePost({
        topic,
        platform: 'instagram',
        tone: 'casual',
        length: 'short',
        includeHashtags: true,
      });
      setContent(result.content || result.text || '');
    } catch (err: any) {
      alert('AI generation failed: ' + err.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.deletePlatformPost(selectedAccount, postId);
      alert('Post deleted');
      loadPosts(selectedAccount);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-4xl">📷</span>
            Instagram Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your Instagram accounts, photos, and stories
          </p>
        </div>
        <button
          onClick={handleConnectAccount}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Connect Account
        </button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalPosts || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Engagement Rate</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.engagementRate || '0'}%
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.followers || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Reach (30d)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.reach || 0}
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Accounts ({accounts.length})
          </h3>
        </div>
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No Instagram accounts connected</p>
              <button
                onClick={handleConnectAccount}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Connect Your First Account
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
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {account.accountName?.[0] || 'I'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        @{account.accountName || account.username || 'instagram'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {account.platform} • {account.isActive ? '✅ Active' : '❌ Inactive'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedAccount(account.id);
                        setShowPostComposer(true);
                      }}
                      className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                    >
                      Post
                    </button>
                    <button
                      onClick={() => handleRefreshToken(account.id)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => handleDisconnect(account.id)}
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

      {/* Post Composer */}
      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Post
            </h3>
            <button
              onClick={() => setShowPostComposer(!showPostComposer)}
              className="text-purple-600 hover:text-purple-900 text-sm font-medium"
            >
              {showPostComposer ? 'Hide' : 'Show'} Composer
            </button>
          </div>

          {showPostComposer && (
            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  📸 <strong>Note:</strong> Instagram requires at least one image or video. Add a media URL below.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      @{account.accountName || account.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image/Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  required
                />
                <button
                  onClick={() => router.push('/media')}
                  className="text-sm text-purple-600 hover:text-purple-700 mt-1"
                >
                  Choose from Media Library
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Caption
                  </label>
                  <button
                    onClick={handleGenerateAI}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    ✨ Generate with AI
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a caption..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={6}
                />
                <p className="text-sm text-gray-500 mt-1">{content.length} characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePost}
                  disabled={posting || !content || !mediaUrl}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
                >
                  {posting ? 'Posting...' : scheduledFor ? 'Schedule Post' : 'Post Now'}
                </button>
                <button
                  onClick={() => setShowPostComposer(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Posts */}
      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Posts ({posts.length})
            </h3>
          </div>
          <div className="p-6">
            {posts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No posts yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {posts.slice(0, 9).map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden"
                  >
                    {post.mediaUrl && (
                      <img
                        src={post.mediaUrl}
                        alt="Post"
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>❤️ {post.likes || 0}</span>
                        <span>💬 {post.comments || 0}</span>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-600 hover:text-red-900 text-xs mt-2"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/campaigns?platform=instagram')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Create Campaign
            </button>
            <button
              onClick={() => router.push('/analytics?platform=instagram')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              View Analytics
            </button>
            <button
              onClick={() => router.push('/media')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Media Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
