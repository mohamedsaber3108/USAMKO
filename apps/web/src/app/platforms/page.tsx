'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  {
    id: '5',
    name: 'WhatsApp Business',
    slug: 'whatsapp',
    icon: 'wa',
    description: 'Send messages via WhatsApp Business',
    connected: false,
  },
];

export default function PlatformsPage() {
  const [platformsData, setPlatformsData] = useState<Platform[]>(platforms);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    // Load platforms (mock data for now)
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
      {
        id: '5',
        name: 'WhatsApp Business',
        slug: 'whatsapp',
        icon: 'wa',
        description: 'Send messages via WhatsApp Business',
        connected: false,
      },
    ]);

    setLoading(false);
  }, [router]);

  const handleConnect = (platform: Platform) => {
    // In a real app, this would redirect to OAuth flow
    alert(`Connect ${platform.name} - OAuth flow would start here`);
  };

  const handleDisconnect = (platform: Platform) => {
    if (confirm(`Are you sure you want to disconnect ${platform.name}?`)) {
      setPlatformsData(
        platformsData.map(p =>
          p.id === platform.id ? { ...p, connected: false, accountId: undefined } : p
        )
      );
    }
  };

  const handleCreatePost = (platform: Platform) => {
    // Redirect to create post page with platform selected
    router.push(`/posts/create?platform=${platform.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/workflows"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Workflows
            </Link>
            <Link
              href="/platforms"
              className="flex items-center px-4 py-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Platforms
            </Link>
            <Link
              href="/analytics"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Analytics
            </Link>
            <Link
              href="/settings"
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Platforms</h1>
              <p className="text-gray-600 dark:text-gray-400">Connect your social media accounts</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Refresh
            </button>
          </div>

          {/* Platforms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformsData.map(platform => (
              <div key={platform.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${
                        platform.connected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {platform.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {platform.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                  {platform.connected && (
                    <span className="px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
                      Connected
                    </span>
                  )}
                </div>

                {platform.connected ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Account ID: {platform.accountId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreatePost(platform)}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Post
                    </button>
                    <button
                      onClick={() => handleDisconnect(platform)}
                      className="w-full px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Connect Account
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Platform Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Platforms
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {platformsData.length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Connected</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {platformsData.filter(p => p.connected).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {platformsData.filter(p => !p.connected).length}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
