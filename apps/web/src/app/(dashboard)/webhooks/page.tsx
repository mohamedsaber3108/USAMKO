'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = () => {
    api.getWebhooks()
      .then(data => {
        setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleTest = async (id: string) => {
    try {
      await api.testWebhook(id);
      alert('Test webhook sent');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.deleteWebhook(id);
      alert('Webhook deleted');
      loadWebhooks();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Receive real-time event notifications
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Events
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <tr key={webhook.id}>
                <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white truncate max-w-xs">
                  {webhook.url}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {webhook.events?.join(', ') || 'All events'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    webhook.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {webhook.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleTest(webhook.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {webhooks.length === 0 && (
          <div className="text-center py-12 text-gray-500">No webhooks configured</div>
        )}
      </div>
    </div>
  );
}
