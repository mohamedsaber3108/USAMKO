'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AutomationPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create session form
  const [profileName, setProfileName] = useState('');
  const [url, setUrl] = useState('');
  const [headless, setHeadless] = useState(true);
  const [userAgent, setUserAgent] = useState('');
  const [proxy, setProxy] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sessionsData, statsData] = await Promise.all([
        api.getAutomationSessions?.().catch(() => []),
        api.getAutomationStats?.().catch(() => null),
      ]);

      setSessions(Array.isArray(sessionsData) ? sessionsData : sessionsData?.sessions || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load automation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!profileName) {
      alert('Please enter a profile name');
      return;
    }

    setCreating(true);
    try {
      await api.createAutomationSession({
        profileName,
        headless,
        userAgent: userAgent || undefined,
        proxy: proxy || undefined,
      });
      alert('Browser session created successfully!');
      setShowCreateForm(false);
      setProfileName('');
      setUrl('');
      setUserAgent('');
      setProxy('');
      loadData();
    } catch (err: any) {
      alert('Failed to create session: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleNavigate = async (sessionId: string) => {
    const targetUrl = prompt('Enter URL to navigate to:');
    if (!targetUrl) return;

    try {
      await api.navigateAutomation(sessionId, targetUrl);
      alert('Navigation complete');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleScreenshot = async (sessionId: string) => {
    try {
      const result = await api.screenshotAutomation(sessionId);
      alert('Screenshot saved: ' + (result.path || 'Success'));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleExecuteScript = async (sessionId: string) => {
    const script = prompt('Enter JavaScript to execute:', 'document.title');
    if (!script) return;

    try {
      const result = await api.executeAutomationScript(sessionId, script);
      alert('Result: ' + JSON.stringify(result, null, 2));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!confirm('Close this browser session?')) return;
    try {
      await api.closeAutomationSession(sessionId);
      alert('Session closed');
      loadData();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Browser Automation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Control headless browsers with Playwright/Puppeteer
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + New Session
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          🤖 <strong>Browser Automation</strong> - Create persistent browser sessions for web scraping,
          testing, and automation. Each session runs in an isolated browser context with custom profiles,
          proxies, and user agents.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.activeSessions || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalSessions || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Actions Today</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.actionsToday || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Screenshots</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.screenshots || 0}
            </div>
          </div>
        </div>
      )}

      {/* Create Session Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create Browser Session
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g., scraper-1, test-profile"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Agent (optional)
              </label>
              <input
                type="text"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="Mozilla/5.0..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proxy (optional)
              </label>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                placeholder="http://proxy:port"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="headless"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="headless" className="text-sm text-gray-700 dark:text-gray-300">
                Run in headless mode (no visible browser window)
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateSession}
                disabled={creating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Session'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Active Sessions ({sessions.length})
          </h3>
        </div>
        <div className="p-6">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No active browser sessions</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Create Your First Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {session.profileName || session.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        Status: {session.status || 'Active'} •
                        Created: {session.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Running
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleNavigate(session.id)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      Navigate
                    </button>
                    <button
                      onClick={() => handleScreenshot(session.id)}
                      className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    >
                      Screenshot
                    </button>
                    <button
                      onClick={() => handleExecuteScript(session.id)}
                      className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                    >
                      Execute Script
                    </button>
                    <button
                      onClick={() => handleCloseSession(session.id)}
                      className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Common Use Cases
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              🔍 Web Scraping
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Extract data from websites that require JavaScript rendering or have anti-bot protection.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              🧪 Automated Testing
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test your web applications automatically with custom user flows and scenarios.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              📸 Screenshot Capture
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Take automated screenshots of web pages for monitoring, archiving, or reporting.
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              🤖 Task Automation
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automate repetitive web tasks like form filling, data entry, and content publishing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
