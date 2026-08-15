'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function TwitterPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostComposer, setShowPostComposer] = useState(false);
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
        api.getPlatforms({ platform: 'twitter' }),
        api.getAnalyticsPlatforms('twitter').catch(() => null),
      ]);

      const twitterAccounts = Array.isArray(accountsData)
        ? accountsData
        : accountsData.platforms || [];

      setAccounts(twitterAccounts);
      setAnalytics(analyticsData);

      if (twitterAccounts.length > 0) {
        setSelectedAccount(twitterAccounts[0].id);
        loadPosts(twitterAccounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load Twitter data:', err);
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

  const handlePost = async () => {
    if (!selectedAccount || !content) {
      alert('Please enter tweet content');
      return;
    }

    if (content.length > 280) {
      alert('Tweet must be 280 characters or less');
      return;
    }

    setPosting(true);
    try {
      const postData: any = { content };
      if (mediaUrl) postData.mediaUrl = mediaUrl;
      if (scheduledFor) postData.scheduledFor = new Date(scheduledFor).toISOString();

      await api.postToPlatform(selectedAccount, postData);
      alert('Tweet posted successfully!');
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
        platform: 'twitter',
        tone: 'casual',
        length: 'short',
        includeHashtags: true,
      });
      setContent(result.content || result.text || '');
    } catch (err: any) {
      alert('AI generation failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-4xl">🐦</span>
            Twitter/X Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your Twitter accounts and tweets
          </p>
        </div>
        <button
          onClick={() => alert('OAuth integration: Will redirect to Twitter OAuth flow')}
          className="bg-blue-400 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Connect Account
        </button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tweets</div>
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
            <div className="text-sm text-gray-600 dark:text-gray-400">Impressions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.reach || 0}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connected Accounts ({accounts.length})
          </h3>
        </div>
        <div className="p-6">
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No Twitter accounts connected</p>
              <button
                onClick={() => alert('OAuth integration')}
                className="bg-blue-400 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg"
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
                    <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {account.accountName?.[0] || 'T'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        @{account.accountName || account.username || 'twitter'}
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
                      className="text-blue-400 hover:text-blue-600 text-sm font-medium"
                    >
                      Tweet
                    </button>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Compose Tweet
            </h3>
            <button
              onClick={() => setShowPostComposer(!showPostComposer)}
              className="text-blue-400 hover:text-blue-600 text-sm font-medium"
            >
              {showPostComposer ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPostComposer && (
            <div className="p-6 space-y-4">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    What's happening?
                  </label>
                  <button
                    onClick={handleGenerateAI}
                    className="text-sm text-blue-400 hover:text-blue-600"
                  >
                    ✨ Generate with AI
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                  maxLength={280}
                />
                <p className={`text-sm mt-1 ${content.length > 280 ? 'text-red-500' : 'text-gray-500'}`}>
                  {content.length}/280 characters
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
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
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
                  disabled={posting || !content || content.length > 280}
                  className="flex-1 bg-blue-400 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
                >
                  {posting ? 'Posting...' : scheduledFor ? 'Schedule Tweet' : 'Tweet'}
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

      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Tweets ({posts.length})
            </h3>
          </div>
          <div className="p-6">
            {posts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tweets yet</p>
            ) : (
              <div className="space-y-4">
                {posts.slice(0, 10).map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>❤️ {post.likes || 0}</span>
                      <span>🔄 {post.retweets || 0}</span>
                      <span>💬 {post.replies || 0}</span>
                      <span>• {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/campaigns?platform=twitter')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Create Campaign
            </button>
            <button
              onClick={() => router.push('/analytics?platform=twitter')}
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
