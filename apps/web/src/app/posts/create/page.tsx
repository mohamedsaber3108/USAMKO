'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';



interface Platform {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  connected: boolean;
  accountId?: string;
}

interface SelectedPlatform {
  slug: string;
  name: string;
  icon: string;
}

const platforms: Platform[] = [
  {
    id: '1',
    name: 'Facebook',
    slug: 'facebook',
    icon: 'f',
    description: 'Post to your Facebook page',
    connected: false,
  },
  {
    id: '2',
    name: 'Instagram',
    slug: 'instagram',
    icon: 'i',
    description: 'Post to your Instagram account',
    connected: false,
  },
  {
    id: '3',
    name: 'LinkedIn',
    slug: 'linkedin',
    icon: 'in',
    description: 'Post to your LinkedIn profile',
    connected: false,
  },
  {
    id: '4',
    name: 'Twitter',
    slug: 'twitter',
    icon: 'tw',
    description: 'Post tweets to your Twitter account',
    connected: false,
  },
];

function CreatePostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const platformSlug = searchParams.get('platform');

  // Form state
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SelectedPlatform[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link'>('image');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load platforms from localStorage
  const [platformsData, setPlatformsData] = useState<Platform[]>(platforms);

  useEffect(() => {
    // Check authentication
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    // Load platforms
    setPlatformsData([
      {
        id: '1',
        name: 'Facebook',
        slug: 'facebook',
        icon: 'f',
        description: 'Post to your Facebook page',
        connected: true,
        accountId: 'fb_12345',
      },
      {
        id: '2',
        name: 'Instagram',
        slug: 'instagram',
        icon: 'i',
        description: 'Post to your Instagram account',
        connected: true,
        accountId: 'ig_67890',
      },
      {
        id: '3',
        name: 'LinkedIn',
        slug: 'linkedin',
        icon: 'in',
        description: 'Post to your LinkedIn profile',
        connected: false,
      },
      {
        id: '4',
        name: 'Twitter',
        slug: 'twitter',
        icon: 'tw',
        description: 'Post tweets to your Twitter account',
        connected: false,
      },
    ]);

    // Pre-select platform from URL parameter
    if (platformSlug) {
      const platform = platformsData.find(p => p.slug === platformSlug);
      if (platform && platform.connected) {
        setSelectedPlatforms([{ slug: platform.slug, name: platform.name, icon: platform.icon }]);
      }
    }
  }, [platformSlug, router, platformsData]);

  // Character count for Twitter
  const getCharacterCount = (text: string) => {
    if (!text) return 0;
    // URLs count as 23 characters
    const urlRegex = /https?:\/\/[^\s]+/g;
    const textWithoutUrls = text.replace(urlRegex, 'x'.repeat(23));
    return textWithoutUrls.length;
  };

  // Toggle platform selection
  const togglePlatform = (slug: string) => {
    const platform = platformsData.find(p => p.slug === slug);
    if (!platform?.connected) return;

    setSelectedPlatforms(prev => {
      const exists = prev.find(p => p.slug === slug);
      if (exists) {
        return prev.filter(p => p.slug !== slug);
      } else {
        return [...prev, { slug: platform.slug, name: platform.name, icon: platform.icon }];
      }
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (selectedPlatforms.length === 0) {
      newErrors.platforms = 'Select at least one platform';
    }

    // Check Twitter character limit
    const twitterPlatform = selectedPlatforms.find(p => p.slug === 'twitter');
    if (twitterPlatform && getCharacterCount(content) > 280) {
      newErrors.content = 'Twitter posts are limited to 280 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // In a real app, this would make API calls to each platform
      const payload = {
        content,
        platforms: selectedPlatforms.map(p => p.slug),
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        scheduledAt: scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : undefined,
      };

      console.log('Submitting post:', payload);

      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Show success message
      alert('Post published successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error publishing post:', error);
      setErrors({ submit: 'Failed to publish post. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get platform icon component
  const PlatformIcon = ({ icon }: { icon: string }) => {
    const icons: Record<string, React.ReactNode> = {
      f: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      i: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      in: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
      tw: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
        </svg>
      ),
    };
    return icons[icon] || null;
  };

  // Render preview for each platform
  const renderPreview = () => {
    return (
      <div className="space-y-4">
        {selectedPlatforms.map(platform => (
          <div key={platform.slug} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-blue-600 dark:text-blue-400">
                <PlatformIcon icon={platform.icon} />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{platform.name}</span>
            </div>
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
              {content || <span className="text-gray-400 italic">Your post content will appear here...</span>}
            </div>
            {mediaUrl && (
              <div className="mt-3">
                {mediaType === 'image' && (
                  <img src={mediaUrl} alt="Post media" className="max-h-48 rounded-lg object-cover" />
                )}
                {mediaType === 'video' && (
                  <div className="bg-black rounded-lg flex items-center justify-center h-48">
                    <span className="text-white">Video preview</span>
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">
              {scheduleDate && scheduleTime && (
                <span>Scheduled: {scheduleDate} {scheduleTime}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed lg:static z-30 w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">USAMKO</h1>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/workflows"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Workflows
            </Link>
            <Link
              href="/platforms"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Platforms
            </Link>
            <Link
              href="/analytics"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>
            <Link
              href="/settings"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Settings
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                U
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">user@example.com</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                router.push('/login');
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create Post</h1>
              <p className="text-gray-600 dark:text-gray-400">Create a new social media post</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Post Composer */}
            <div className="space-y-6">
              {/* Content Editor */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content</h2>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="mt-2 flex justify-between items-center">
                  <span className={`text-sm ${getCharacterCount(content) > 280 ? 'text-red-500' : 'text-gray-500'}`}>
                    {getCharacterCount(content)}/280 characters
                  </span>
                  {errors.content && <span className="text-red-500 text-sm">{errors.content}</span>}
                </div>
              </div>

              {/* Media Upload */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Media</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Media URL
                    </label>
                    <input
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Media Type
                    </label>
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as 'image' | 'video' | 'link')}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                      <option value="link">Link</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Platform Selection */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Platforms</h2>
                <div className="space-y-3">
                  {platformsData.map(platform => (
                    <div
                      key={platform.slug}
                      onClick={() => togglePlatform(platform.slug)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedPlatforms.find(p => p.slug === platform.slug)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : platform.connected
                          ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          : 'border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          platform.connected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          <PlatformIcon icon={platform.icon} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{platform.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{platform.description}</p>
                        </div>
                        {selectedPlatforms.find(p => p.slug === platform.slug) && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.platforms && <span className="text-red-500 text-sm">{errors.platforms}</span>}
              </div>

              {/* Schedule */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              {isPreviewOpen && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h2>
                  {renderPreview()}
                </div>
              )}
            </div>

            {/* Right Column - Preview */}
            {isPreviewOpen && (
              <div className="lg:col-span-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h2>
                {renderPreview()}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreatePostPageInner />
    </Suspense>
  );
}
