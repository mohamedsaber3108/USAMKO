'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AddPlatformPage() {
  const router = useRouter();
  const [platform, setPlatform] = useState('LINKEDIN');
  const [method, setMethod] = useState('manual');
  const [loading, setLoading] = useState(false);

  // Manual cookie entry
  const [accountName, setAccountName] = useState('');
  const [liAt, setLiAt] = useState('');
  const [jsessionId, setJsessionId] = useState('');

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createPlatform({
        platform,
        accountName: accountName || 'My LinkedIn Account',
        accountId: `linkedin_${Date.now()}`,
        cookies: {
          li_at: liAt,
          JSESSIONID: jsessionId || '',
        },
        metadata: {
          connectionMethod: 'manual',
          capturedAt: new Date().toISOString(),
        },
      });

      alert('✓ LinkedIn account added successfully!');
      router.push('/platforms');
    } catch (err: any) {
      alert('Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add Platform Account</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Connect your social media accounts to USAMKO
        </p>
      </div>

      {/* Platform Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="LINKEDIN">LinkedIn</option>
            <option value="FACEBOOK">Facebook (Coming Soon)</option>
            <option value="INSTAGRAM">Instagram (Coming Soon)</option>
            <option value="TELEGRAM">Telegram (Coming Soon)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Connection Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="manual">Manual Cookie Entry (Recommended)</option>
            <option value="extension">Chrome Extension (Unreliable)</option>
          </select>
        </div>
      </div>

      {/* Manual Entry Form */}
      {method === 'manual' && platform === 'LINKEDIN' && (
        <form onSubmit={handleManualSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to get your LinkedIn cookies:</h3>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Open LinkedIn.com in a new tab (make sure you're logged in)</li>
              <li>Press F12 to open DevTools</li>
              <li>Go to the "Application" tab (or "Storage" in Firefox)</li>
              <li>In the left sidebar: Cookies → https://www.linkedin.com</li>
              <li>Find the cookie named <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">li_at</code></li>
              <li>Double-click its Value and copy it (starts with "AQED...")</li>
              <li>Paste it below</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Account Name (optional)
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g., My Personal LinkedIn"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              li_at Cookie <span className="text-red-500">*</span>
            </label>
            <textarea
              value={liAt}
              onChange={(e) => setLiAt(e.target.value)}
              placeholder="Paste your li_at cookie value here (starts with AQED...)"
              rows={3}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              JSESSIONID Cookie (optional)
            </label>
            <input
              type="text"
              value={jsessionId}
              onChange={(e) => setJsessionId(e.target.value)}
              placeholder="Optional - improves reliability"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/platforms')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !liAt}
              className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold"
            >
              {loading ? 'Adding Account...' : 'Add Account'}
            </button>
          </div>
        </form>
      )}

      {/* Extension Method */}
      {method === 'extension' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ Extension-based capture is unreliable due to LinkedIn security. We recommend using Manual Entry instead.
            </p>
          </div>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>Make sure the USAMKO Chrome Extension is installed and connected</li>
            <li>Visit {platform.toLowerCase()}.com in a new tab</li>
            <li>Log in if you're not already</li>
            <li>Wait 5 seconds - the extension will auto-capture your session</li>
            <li>Return here and check the Connected Accounts counter</li>
          </ol>
        </div>
      )}
    </div>
  );
}
