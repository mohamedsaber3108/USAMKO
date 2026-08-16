'use client';

import { useState } from 'react';
import api from '@/lib/api';

const RESEARCH_TOOLS = [
  { id: 'email-finder', name: 'Email Finder', icon: '📧', desc: 'Find email addresses by name + domain', category: 'Email' },
  { id: 'email-verify', name: 'Email Verification', icon: '✓', desc: 'Verify email deliverability', category: 'Email' },
  { id: 'bulk-email', name: 'Bulk Email Finder', icon: '📨', desc: 'Find emails in bulk (CSV)', category: 'Email' },
  { id: 'company-info', name: 'Company Lookup', icon: '🏢', desc: 'Get company info by domain', category: 'Company' },
  { id: 'bulk-company', name: 'Bulk Company Enrichment', icon: '🏭', desc: 'Enrich multiple companies', category: 'Company' },
  { id: 'lead-gen', name: 'Lead Generator', icon: '🎯', desc: 'Generate B2B leads by criteria', category: 'Leads' },
  { id: 'quick-research', name: 'Quick Research', icon: '⚡', desc: 'Fast company research', category: 'Research' },
  { id: 'deep-research', name: 'Deep Research', icon: '🔬', desc: 'Comprehensive URL analysis', category: 'Research' },
  { id: 'scrape-web', name: 'Website Scraper', icon: '🌐', desc: 'Extract full website content', category: 'Scraping' },
  { id: 'scrape-emails', name: 'Email Scraper', icon: '✉️', desc: 'Extract emails from pages', category: 'Scraping' },
  { id: 'scrape-phones', name: 'Phone Scraper', icon: '📞', desc: 'Extract phone numbers', category: 'Scraping' },
  { id: 'scrape-social', name: 'Social Scraper', icon: '👥', desc: 'Extract social media links', category: 'Scraping' },
  { id: 'deep-crawl', name: 'Deep Crawler', icon: '🕷️', desc: 'Multi-level site crawling', category: 'Scraping' },
  { id: 'dataset-search', name: 'Dataset Search', icon: '🔍', desc: 'Search 100K+ datasets', category: 'Datasets' },
  { id: 'b2b-datasets', name: 'B2B Datasets', icon: '💼', desc: 'Business-focused datasets', category: 'Datasets' },
  { id: 'popular-datasets', name: 'Popular Datasets', icon: '🔥', desc: 'Trending datasets', category: 'Datasets' },
  { id: 'dataset-download', name: 'Dataset Downloader', icon: '⬇️', desc: 'Download datasets', category: 'Datasets' },
];

export default function ResearchPage() {
  const [selectedTool, setSelectedTool] = useState(RESEARCH_TOOLS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  // Form states
  const [formData, setFormData] = useState<any>({});

  const categories = ['all', ...Array.from(new Set(RESEARCH_TOOLS.map(t => t.category)))];

  const filteredTools = filterCategory === 'all'
    ? RESEARCH_TOOLS
    : RESEARCH_TOOLS.filter(t => t.category === filterCategory);

  const handleExecute = async () => {
    setLoading(true);
    setResult(null);
    try {
      let res;
      switch (selectedTool.id) {
        case 'email-finder':
          res = await api.findEmail(formData);
          break;
        case 'email-verify':
          res = await api.verifyEmail(formData);
          break;
        case 'bulk-email':
          res = await api.bulkFindEmails(formData);
          break;
        case 'company-info':
          res = await api.getCompanyInfo(formData);
          break;
        case 'bulk-company':
          res = await api.bulkCompanyEnrichment(formData);
          break;
        case 'lead-gen':
          res = await api.generateLeads(formData);
          break;
        case 'quick-research':
          res = await api.quickResearch(formData);
          break;
        case 'deep-research':
          res = await api.deepResearch(formData);
          break;
        case 'scrape-web':
          res = await api.scrapeWebsite(formData);
          break;
        case 'scrape-emails':
          res = await api.scrapeEmails(formData);
          break;
        case 'scrape-phones':
          res = await api.scrapePhones(formData);
          break;
        case 'scrape-social':
          res = await api.scrapeSocial(formData);
          break;
        case 'deep-crawl':
          res = await api.deepCrawl(formData);
          break;
        case 'dataset-search':
          res = await api.searchDatasets(formData);
          break;
        case 'b2b-datasets':
          res = await api.getB2BDatasets();
          break;
        case 'popular-datasets':
          res = await api.getPopularDatasets();
          break;
        case 'dataset-download':
          res = await api.downloadDataset(formData);
          break;
        default:
          res = { error: 'Tool not implemented' };
      }
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (selectedTool.id) {
      case 'email-finder':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="First Name" value={formData.firstName || ''} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="text" placeholder="Last Name" value={formData.lastName || ''} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="text" placeholder="Domain (e.g., company.com)" value={formData.domain || ''} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'email-verify':
        return (
          <div className="space-y-4">
            <input type="email" placeholder="Email to verify" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'company-info':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Company domain (e.g., company.com)" value={formData.domain || ''} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'quick-research':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Company name" value={formData.company || ''} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'deep-research':
        return (
          <div className="space-y-4">
            <input type="url" placeholder="Website URL" value={formData.url || ''} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'scrape-web':
      case 'scrape-emails':
      case 'scrape-phones':
      case 'scrape-social':
        return (
          <div className="space-y-4">
            <input type="url" placeholder="Website URL" value={formData.url || ''} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'deep-crawl':
        return (
          <div className="space-y-4">
            <input type="url" placeholder="Website URL" value={formData.url || ''} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="number" placeholder="Depth (default: 3)" value={formData.depth || ''} onChange={(e) => setFormData({ ...formData, depth: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'dataset-search':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Search query" value={formData.query || ''} onChange={(e) => setFormData({ ...formData, query: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'dataset-download':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Dataset slug" value={formData.slug || ''} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'lead-gen':
        return (
          <div className="space-y-4">
            <input type="text" placeholder="Industry" value={formData.industry || ''} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="text" placeholder="Location" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="text" placeholder="Company Size" value={formData.companySize || ''} onChange={(e) => setFormData({ ...formData, companySize: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'bulk-company':
        return (
          <div className="space-y-4">
            <textarea placeholder="Domains (one per line)" rows={5} value={formData.domains?.join('\n') || ''} onChange={(e) => setFormData({ ...formData, domains: e.target.value.split('\n').filter(Boolean) })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          </div>
        );
      case 'bulk-email':
        return (
          <div className="space-y-4">
            <textarea placeholder="Contacts (JSON array)" rows={5} value={formData.contactsText || ''} onChange={(e) => setFormData({ ...formData, contactsText: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm" />
            <p className="text-xs text-gray-500">
              Format: [{`{"firstName":"John","lastName":"Doe","domain":"company.com"}`}, ...]
            </p>
          </div>
        );
      default:
        return <p className="text-gray-500">No input required</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Research & Data Tools
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          17 FREE research tools for finding emails, scraping data, and company intelligence
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <p className="text-sm text-green-800 dark:text-green-200">
          💰 <strong>100% FREE</strong> - All {RESEARCH_TOOLS.length} research tools are completely free with no rate limits!
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap ${
              filterCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {cat === 'all' ? 'All Tools' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Grid */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Select Tool ({filteredTools.length})
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedTool(tool);
                    setFormData({});
                    setResult(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTool.id === tool.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{tool.icon}</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {tool.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                    {tool.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Form & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{selectedTool.icon}</span>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedTool.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTool.desc}
                </p>
              </div>
            </div>

            {renderForm()}

            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? '⏳ Processing...' : `🚀 Execute ${selectedTool.name}`}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Results
              </h3>
              {result.error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200">{result.error}</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg max-h-96 overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `research-${selectedTool.id}-${Date.now()}.json`;
                  a.click();
                }}
                className="mt-4 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                💾 Export Results
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Research Tools
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {RESEARCH_TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="text-3xl mb-2">{tool.icon}</div>
              <div className="text-xs font-medium text-gray-900 dark:text-white">
                {tool.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
