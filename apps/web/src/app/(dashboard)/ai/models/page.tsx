'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function AIModelsPage() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  useEffect(() => {
    api.getAiModels()
      .then(data => {
        setModels(Array.isArray(data) ? data : data.models || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredModels = models.filter(m => {
    if (filter === 'available') return m.isAvailable;
    if (filter === 'unavailable') return !m.isAvailable;
    return true;
  });

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Models</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Available AI models across providers
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'available', 'unavailable'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModels.map((model) => (
          <div key={model.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                <p className="text-sm text-gray-500">{model.provider}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                model.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {model.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Tier:</span> {model.tier}</p>
              <p><span className="font-medium">Context:</span> {model.contextWindow?.toLocaleString() || 'N/A'} tokens</p>
              {model.costPer1kTokens && (
                <p><span className="font-medium">Cost:</span> ${model.costPer1kTokens}/1K tokens</p>
              )}
              {model.description && (
                <p className="text-xs mt-2">{model.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No models found</p>
        </div>
      )}
    </div>
  );
}
