'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchLead(params.id as string);
    }
  }, [params.id]);

  const fetchLead = async (id: string) => {
    try {
      const data = await api.getLead(id);
      setLead(data);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading lead...</div>;
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p>Lead not found</p>
        <Link href="/leads" className="text-blue-600 hover:underline">Back to leads</Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/leads" className="text-blue-600 hover:underline">&larr; Back to Leads</Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
          <h1 className="text-3xl font-bold">{lead.fullName}</h1>
          <p className="text-blue-100 mt-1">{lead.title || 'No title'} at {lead.company?.name || 'Unknown'}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Contact Info */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1">{lead.email || 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1">{lead.phone || 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1">{lead.location || 'Not available'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                  <dd className="mt-1">
                    {lead.linkedinUrl ? (
                      <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        View Profile
                      </a>
                    ) : (
                      'Not available'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Right Column - Lead Info */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Lead Information</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Source</dt>
                  <dd className="mt-1">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {lead.source}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {lead.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Lead Score</dt>
                  <dd className="mt-1">
                    <span className={`text-2xl font-bold ${lead.score >= 70 ? 'text-green-600' : lead.score >= 40 ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {lead.score || 0}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">/ 100</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1">{new Date(lead.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Enrichments */}
          {lead.enrichments && lead.enrichments.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Enrichment History</h2>
              <div className="space-y-2">
                {lead.enrichments.map((enrichment: any) => (
                  <div key={enrichment.id} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{enrichment.type}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(enrichment.enrichedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Provider: {enrichment.provider} | Confidence: {Math.round(enrichment.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t flex gap-4">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Add to Campaign
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
              Edit Lead
            </button>
            <button className="px-4 py-2 text-red-600 hover:text-red-800">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
