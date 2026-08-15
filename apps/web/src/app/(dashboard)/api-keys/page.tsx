'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    api.getApiKeys()
      .then(data => {
        setKeys(Array.isArray(data) ? data : data.keys || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleCreate = async () => {
    if (!newKeyName) return;
    try {
      const result = await api.createApiKey({ name: newKeyName });
      alert(`API Key Created:\n\n${result.key}\n\nSave this key - it won't be shown again!`);
      setNewKeyName('');
      setShowCreate(false);
      loadKeys();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api.revokeApiKey(id);
      alert('Key revoked');
      loadKeys();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleRotate = async (id: string) => {
    if (!confirm('Rotate this API key? The old key will stop working.')) return;
    try {
      const result = await api.rotateApiKey(id);
      alert(`New API Key:\n\n${result.key}\n\nSave this key - it won't be shown again!`);
      loadKeys();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Keys</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your API authentication keys
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Create Key
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create API Key</h3>
          <input
            type="text"
            placeholder="Key name (e.g., Production Server)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newKeyName}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Key (masked)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {keys.map((key) => (
              <tr key={key.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {key.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {key.key ? `${key.key.substring(0, 10)}...` : '••••••••••••'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    key.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {key.isActive ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {key.isActive && (
                    <>
                      <button
                        onClick={() => handleRotate(key.id)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Rotate
                      </button>
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keys.length === 0 && (
          <div className="text-center py-12 text-gray-500">No API keys yet</div>
        )}
      </div>
    </div>
  );
}
