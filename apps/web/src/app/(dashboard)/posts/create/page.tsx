'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CreatePostPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPlatforms()
      .then(data => {
        const platformList = Array.isArray(data) ? data : data.platforms || [];
        setPlatforms(platformList.filter(p => p.isActive));
        if (platformList.length > 0) {
          setSelectedPlatform(platformList[0].id);
        }
      })
      .catch(err => console.error('Failed to load platforms:', err));
  }, []);

  const handlePost = async () => {
    if (!selectedPlatform || !content) {
      alert('Please select a platform and enter content');
      return;
    }

    setLoading(true);
    try {
      const postData: any = { content };
      if (mediaUrl) postData.mediaUrl = mediaUrl;
      if (scheduledFor) postData.scheduledFor = new Date(scheduledFor).toISOString();

      await api.postToPlatform(selectedPlatform, postData);
      alert('Post created successfully!');
      router.push('/platforms');
    } catch (err: any) {
      alert('Failed to create post: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    const topic = prompt('Enter topic for AI generation:');
    if (!topic) return;

    setLoading(true);
    try {
      const result = await api.generatePost({
        topic,
        platform: 'linkedin',
        tone: 'professional',
        length: 'medium',
        includeHashtags: true,
      });
      setContent(result.content || result.text || '');
    } catch (err: any) {
      alert('AI generation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Post</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Publish content across your platforms
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Platform
            </label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.platform} - {platform.accountName || platform.username}
                </option>
              ))}
            </select>
            {platforms.length === 0 && (
              <p className="text-sm text-red-600 mt-1">No active platforms. Connect one first.</p>
            )}
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content
              </label>
              <button
                onClick={handleGenerateWithAI}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ✨ Generate with AI
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={8}
            />
            <p className="text-sm text-gray-500 mt-1">{content.length} characters</p>
          </div>

          {/* Media URL */}
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

          {/* Schedule */}
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
            <p className="text-xs text-gray-500 mt-1">Leave empty to post immediately</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handlePost}
              disabled={loading || !selectedPlatform || !content}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Posting...' : scheduledFor ? 'Schedule Post' : 'Post Now'}
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      {content && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{content}</p>
            {mediaUrl && (
              <div className="mt-4">
                <img src={mediaUrl} alt="Preview" className="max-w-full h-auto rounded" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
