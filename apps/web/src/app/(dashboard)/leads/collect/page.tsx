'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CollectLeadsPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: 'linkedin',
    industry: '',
    location: '',
    company: '',
    role: '',
    maxResults: 100,
    enrichWithEmail: true,
    autoScore: true,
  });

  const handleCollect = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${API_URL}/leads/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          source: formData.source,
          industry: formData.industry,
          location: formData.location,
          company: formData.company,
          role: formData.role,
          maxResults: formData.maxResults,
          enrichWithEmail: formData.enrichWithEmail,
          autoScore: formData.autoScore,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to collect leads');
        return;
      }
      alert(`Successfully collected ${data.created || 0} leads!`);
      router.push('/leads');
    } catch (error) {
      console.error('Collection error:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Collect New Leads</h1>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 ${s < 3 ? 'border-r-2' : ''} ${step >= s ? 'border-blue-600' : 'border-gray-300'}`}
            >
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                {s}
              </div>
              <div className="text-center mt-2 text-sm">
                {s === 1 && 'Source'}
                {s === 2 && 'Criteria'}
                {s === 3 && 'Options'}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Source Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Lead Source</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'linkedin', label: 'LinkedIn', desc: 'Search professionals on LinkedIn' },
                { value: 'google_maps', label: 'Google Maps', desc: 'Local businesses from Google Maps' },
                { value: 'facebook', label: 'Facebook', desc: 'Facebook page followers (coming soon)', disabled: true },
              ].map((source) => (
                <button
                  key={source.value}
                  disabled={source.disabled}
                  onClick={() => !source.disabled && setFormData({ ...formData, source: source.value })}
                  className={`p-4 border-2 rounded-lg text-left ${formData.source === source.value ? 'border-blue-600 bg-blue-50' : 'border-gray-300'} ${source.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
                >
                  <div className="font-semibold">{source.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{source.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Search Criteria */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Search Criteria</h2>
            <div className="space-y-4">
              {formData.source === 'linkedin' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Industry</label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Software Development"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., Egypt"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role (Optional)</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., CEO, CTO"
                    />
                  </div>
                </>
              )}
              {formData.source === 'google_maps' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Search Query</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., restaurants in Cairo"
                  />
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Options */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Collection Options</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Results</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxResults}
                  onChange={(e) => setFormData({ ...formData, maxResults: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enrichWithEmail}
                  onChange={(e) => setFormData({ ...formData, enrichWithEmail: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Enrich with email addresses (Hunter.io)</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.autoScore}
                  onChange={(e) => setFormData({ ...formData, autoScore: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Automatically calculate lead scores</label>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleCollect}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Collecting...' : 'Start Collection'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
