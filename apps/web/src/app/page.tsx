'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:3000')
      .then(res => res.text())
      .then(data => {
        setApiStatus('success');
        setApiMessage(data);
      })
      .catch(() => {
        setApiStatus('error');
        setApiMessage('Failed to connect to API');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">USAMKO v2.0</h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-8">
            Cloud-Native Enterprise Marketing Automation Platform
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Frontend Status
              </h2>
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Running on port 3001
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Next.js 15 + React 19 + TypeScript
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                Backend API Status
              </h2>
              <div className="flex items-center justify-center">
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${
                    apiStatus === 'loading'
                      ? 'bg-yellow-500 animate-pulse'
                      : apiStatus === 'success'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                  }`}
                ></div>
                <span
                  className={`font-medium ${
                    apiStatus === 'loading'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : apiStatus === 'success'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {apiStatus === 'loading'
                    ? 'Connecting...'
                    : apiStatus === 'success'
                      ? 'Connected'
                      : 'Disconnected'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {apiMessage || 'NestJS + Prisma + PostgreSQL'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Platform Features
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="p-4 bg-blue-50 dark:bg-gray-700 rounded">
                <div className="text-3xl mb-2">🚀</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Automation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Workflow Engine</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-gray-700 rounded">
                <div className="text-3xl mb-2">🤖</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Smart Content</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-gray-700 rounded">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Analytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Real-time Insights</p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-gray-700 rounded">
                <div className="text-3xl mb-2">🌐</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Multi-Channel</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">35+ Platforms</p>
              </div>
            </div>
          </div>

          <div className="text-gray-600 dark:text-gray-400">
            <p className="text-sm">Phase 1 Sprint 1 - Project Setup Complete ✅</p>
            <p className="text-xs mt-2">Ready for authentication implementation (Ticket 3.1)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
