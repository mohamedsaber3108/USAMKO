'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AIBudgetPage() {
  const [budget, setBudget] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAiBudgetStatus(),
      api.getAiCostAnalytics(),
    ]).then(([budgetData, analyticsData]) => {
      setBudget(budgetData);
      setAnalytics(analyticsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Budget & Cost Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor AI usage and spending
        </p>
      </div>

      {/* Budget Status */}
      {budget && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Monthly Budget</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${budget.monthlyLimit || 'Unlimited'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Spent This Month</p>
            <p className="text-3xl font-bold text-blue-600">
              ${budget.spent?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Remaining</p>
            <p className="text-3xl font-bold text-green-600">
              ${budget.remaining?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Analytics */}
      {analytics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.totalRequests?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Tokens</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.totalTokens?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Avg Cost/Request</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${analytics.avgCostPerRequest?.toFixed(4) || '0.0000'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {analytics.cacheHitRate || '0%'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
