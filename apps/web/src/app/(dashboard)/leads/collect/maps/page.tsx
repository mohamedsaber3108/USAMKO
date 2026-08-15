'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function GoogleMapsCollectorPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [collecting, setCollecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [autoEnrich, setAutoEnrich] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await api.getLeadCollections?.();
      setCollections(Array.isArray(data) ? data : data?.collections || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  };

  const handleStartCollection = async () => {
    if (!searchQuery) {
      alert('Please enter a search query');
      return;
    }

    setCollecting(true);
    setProgress(0);
    setResults([]);

    try {
      // Simulate real-time collection via WebSocket
      // In production, this would connect to WebSocket gateway
      const data = await api.collectMapsLeads({
        searchQuery,
        location,
        maxResults,
      });

      const leads = Array.isArray(data) ? data : data.leads || [];
      setResults(leads);
      setProgress(100);

      if (autoEnrich && leads.length > 0) {
        alert('Starting email enrichment...');
        // Trigger enrichment workflow
        await api.enrichLeads(leads.map((l: any) => l.id));
      }

      alert(`Collection complete! Found ${leads.length} businesses.`);
    } catch (err: any) {
      alert('Collection failed: ' + err.message);
    } finally {
      setCollecting(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    const csv = [
      ['Name', 'Address', 'Phone', 'Website', 'Rating', 'Reviews', 'Category'],
      ...results.map(r => [
        r.name || '',
        r.address || '',
        r.phone || '',
        r.website || '',
        r.rating || '',
        r.reviews || '',
        r.category || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `google-maps-${Date.now()}.csv`;
    a.click();
  };

  const handleImportToLeads = async () => {
    const selected = results.filter(r => selectedResults.has(r.id || r.name));

    if (selected.length === 0) {
      alert('Please select results to import');
      return;
    }

    try {
      await api.importLeads(selected);
      alert(`Imported ${selected.length} leads successfully!`);
      router.push('/leads');
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResults(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map(r => r.id || r.name)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Google Maps Lead Collector
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Collect business leads from Google Maps searches
          </p>
        </div>
        <button
          onClick={() => router.push('/extension')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          Extension Setup
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          🗺️ <strong>Note:</strong> This feature requires the USAMKO Chrome Extension.
          Make sure the extension is installed and connected before starting a collection.
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Start New Collection
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., restaurants, dentists, plumbers"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              disabled={collecting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., New York, NY"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              disabled={collecting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Results: {maxResults}
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full"
              disabled={collecting}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span>
              <span>500</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-enrich"
              checked={autoEnrich}
              onChange={(e) => setAutoEnrich(e.target.checked)}
              disabled={collecting}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="auto-enrich" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-enrich with email finder after collection
            </label>
          </div>

          <button
            onClick={handleStartCollection}
            disabled={collecting || !searchQuery || !location}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
          >
            {collecting ? 'Collecting...' : '🔍 Start Collection'}
          </button>
        </div>
      </div>

      {/* Progress */}
      {collecting && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Collection Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Collecting businesses...
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {results.length} found
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="animate-pulse text-sm text-gray-600 dark:text-gray-400">
              Please keep this tab open while collecting...
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Results ({results.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedResults.size === results.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleExportCSV}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={handleImportToLeads}
                disabled={selectedResults.size === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-50"
              >
                Import to Leads ({selectedResults.size})
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedResults.size === results.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result, idx) => {
                    const id = result.id || result.name || idx;
                    return (
                      <tr key={idx}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedResults.has(id)}
                            onChange={() => toggleSelection(id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {result.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.address || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.phone || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          ⭐ {result.rating || 'N/A'} ({result.reviews || 0})
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.category || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Collection History */}
      {collections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Collections
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {collections.slice(0, 5).map((collection, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {collection.query} in {collection.location}
                    </div>
                    <div className="text-sm text-gray-500">
                      {collection.resultCount} results • {collection.createdAt ? new Date(collection.createdAt).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Load collection: ' + collection.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Load Results
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
