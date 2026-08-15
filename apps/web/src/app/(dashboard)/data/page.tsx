'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function DataQueryPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [examples, setExamples] = useState<any[]>([]);

  useEffect(() => {
    api.getDataSources().then(data => setSources(data.sources || [])).catch(() => {});
    api.getDataExamples().then(data => setExamples(data.examples || [])).catch(() => {});
  }, []);

  const handleExecuteQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.executeDataQuery({ query });
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.planDataQuery({ query });
      setResult({ ...res, isPlan: true });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Query Engine</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Natural language queries across multiple data sources
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Input */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Query</h2>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your natural language query... (e.g., 'Find all leads from technology companies in California')"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={6}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleExecuteQuery}
                disabled={loading || !query}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </button>
              <button
                onClick={handlePlanQuery}
                disabled={loading || !query}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Planning...' : 'Plan Query'}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {result.isPlan ? 'Query Plan' : 'Results'}
              </h2>
              {result.error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <pre className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-auto max-h-96 text-sm text-gray-900 dark:text-white">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Data Sources */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Sources</h2>
            <div className="space-y-2">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-900 dark:text-white">{source.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    source.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {source.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              ))}
              {sources.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Loading sources...</p>
              )}
            </div>
          </div>

          {/* Example Queries */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Examples</h2>
            <div className="space-y-2">
              {examples.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(example.query || example)}
                  className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-sm text-gray-900 dark:text-white transition-colors"
                >
                  {example.title || example.query || example}
                </button>
              ))}
              {examples.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Loading examples...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
