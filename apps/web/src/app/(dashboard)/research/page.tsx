'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'company' | 'scrape' | 'leads'>('email');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Email finder
  const [emailData, setEmailData] = useState({
    firstName: '',
    lastName: '',
    domain: '',
  });

  // Company info
  const [companyDomain, setCompanyDomain] = useState('');

  // Web scraping
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeType, setScrapeType] = useState<'website' | 'emails' | 'phones' | 'social'>('website');

  // Lead generation
  const [leadGenData, setLeadGenData] = useState({
    industry: '',
    location: '',
    companySize: '',
    keywords: '',
  });

  const handleFindEmail = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.findEmail(emailData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGetCompanyInfo = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.getCompanyInfo({ domain: companyDomain });
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res;
      switch (scrapeType) {
        case 'website':
          res = await api.scrapeWebsite({ url: scrapeUrl });
          break;
        case 'emails':
          res = await api.scrapeEmails({ url: scrapeUrl });
          break;
        case 'phones':
          res = await api.scrapePhones({ url: scrapeUrl });
          break;
        case 'social':
          res = await api.scrapeSocial({ url: scrapeUrl });
          break;
      }
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLeads = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.generateLeads(leadGenData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Research & Data Collection</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Find emails, scrape websites, and gather company intelligence
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {[
              { id: 'email', label: 'Email Finder' },
              { id: 'company', label: 'Company Info' },
              { id: 'scrape', label: 'Web Scraper' },
              { id: 'leads', label: 'Lead Generator' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setResult(null); }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  value={emailData.firstName}
                  onChange={(e) => setEmailData({ ...emailData, firstName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={emailData.lastName}
                  onChange={(e) => setEmailData({ ...emailData, lastName: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Domain (e.g., company.com)"
                  value={emailData.domain}
                  onChange={(e) => setEmailData({ ...emailData, domain: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleFindEmail}
                disabled={loading || !emailData.firstName || !emailData.lastName || !emailData.domain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Finding Email...' : 'Find Email'}
              </button>
            </div>
          )}

          {activeTab === 'company' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Company domain (e.g., company.com)"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleGetCompanyInfo}
                disabled={loading || !companyDomain}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Fetching Info...' : 'Get Company Info'}
              </button>
            </div>
          )}

          {activeTab === 'scrape' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scrape Type
                </label>
                <select
                  value={scrapeType}
                  onChange={(e) => setScrapeType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="website">Full Website</option>
                  <option value="emails">Extract Emails</option>
                  <option value="phones">Extract Phone Numbers</option>
                  <option value="social">Extract Social Links</option>
                </select>
              </div>
              <input
                type="url"
                placeholder="Website URL"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleScrape}
                disabled={loading || !scrapeUrl}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Scraping...' : 'Start Scraping'}
              </button>
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Industry (e.g., Technology, Healthcare)"
                value={leadGenData.industry}
                onChange={(e) => setLeadGenData({ ...leadGenData, industry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Location (e.g., New York, USA)"
                value={leadGenData.location}
                onChange={(e) => setLeadGenData({ ...leadGenData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Company Size (e.g., 50-200)"
                value={leadGenData.companySize}
                onChange={(e) => setLeadGenData({ ...leadGenData, companySize: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Keywords (comma separated)"
                value={leadGenData.keywords}
                onChange={(e) => setLeadGenData({ ...leadGenData, keywords: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleGenerateLeads}
                disabled={loading || !leadGenData.industry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Generating Leads...' : 'Generate Leads'}
              </button>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-96 overflow-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Result:</h3>
              {result.error ? (
                <p className="text-red-600">{result.error}</p>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
