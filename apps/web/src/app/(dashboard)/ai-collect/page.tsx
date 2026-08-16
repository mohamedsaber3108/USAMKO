'use client';

import { useState } from 'react';
import api from '@/lib/api';

const EXAMPLE_QUERIES = [
  'Find software engineers in San Francisco',
  'Search for marketing managers at tech companies',
  'Get CEOs in the healthcare industry',
  'Find developers with Python skills in New York',
  'Search for product managers in fintech',
];

export default function AICollectPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveAsLeads, setSaveAsLeads] = useState(false);

  const handleCollect = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/data/collect/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ query, saveAsLeads }),
      });

      if (!response.ok) {
        throw new Error('Collection failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to collect data');
    } finally {
      setLoading(false);
    }
  };

  const useExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          AI Data Collection
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Use natural language to collect data from multiple sources
        </p>
      </div>

      {/* Query Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What data are you looking for?
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Find software engineers in San Francisco..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="saveAsLeads"
              checked={saveAsLeads}
              onChange={(e) => setSaveAsLeads(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="saveAsLeads" className="text-sm text-gray-700 dark:text-gray-300">
              Save results as leads
            </label>
          </div>

          <button
            onClick={handleCollect}
            disabled={loading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Collecting...
              </>
            ) : (
              'Collect Data'
            )}
          </button>
        </div>
      </div>

      {/* Example Queries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Example Queries
        </h2>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((example, index) => (
            <button
              key={index}
              onClick={() => useExample(example)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              AI Understanding
            </h3>
            <p className="text-blue-800 dark:text-blue-400 text-sm mb-3">
              {result.understanding}
            </p>
            <p className="text-blue-800 dark:text-blue-400 text-sm">
              {result.summary}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Results</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {result.totalResults}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Sources Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {result.sources.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Execution Time</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {(result.executionTime / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {result.results.length > 0
                  ? (result.results.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / result.results.length).toFixed(0)
                  : '0'}
                /100
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Collected Data ({result.totalResults})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Sources
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {result.results.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {item.fullName || `${item.firstName} ${item.lastName}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.title || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.company || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.location || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${
                          (item.score || 0) >= 80
                            ? 'bg-green-100 text-green-700'
                            : (item.score || 0) >= 60
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.score || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {item.sources?.join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.totalResults === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No results found. Try adjusting your query.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
