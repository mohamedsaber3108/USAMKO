'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface ScrapingAccount {
  id: string;
  platform: string;
  accountType: string;
  accountName: string;
  status: 'active' | 'inactive' | 'error';
  isDefault: boolean;
  lastVerified?: string;
  createdAt: string;
}

export default function ScrapingAccountsPage() {
  const [accounts, setAccounts] = useState<ScrapingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linkedin');
  const [accountType, setAccountType] = useState<'credentials' | 'cookies'>('cookies');

  // Form data
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cookiesJson, setCookiesJson] = useState('');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await api.getScrapingAccounts();
      setAccounts(data);
    } catch (error: any) {
      console.error('Failed to load accounts:', error);
      alert(error.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    try {
      const data: any = {
        platform: selectedPlatform,
        accountType,
        accountName,
      };

      if (accountType === 'credentials') {
        data.credentials = { email, password };
      } else if (accountType === 'cookies') {
        try {
          data.cookies = JSON.parse(cookiesJson);
        } catch (e) {
          alert('Invalid cookies JSON format');
          return;
        }
      }

      if (proxyHost && proxyPort) {
        data.proxy = {
          host: proxyHost,
          port: parseInt(proxyPort),
          username: proxyUsername || undefined,
          password: proxyPassword || undefined,
          type: 'http',
        };
      }

      await api.createScrapingAccount(data);
      alert('Account added successfully!');
      setShowAddModal(false);
      resetForm();
      loadAccounts();
    } catch (error: any) {
      console.error('Failed to add account:', error);
      alert(error.message || 'Failed to add account');
    }
  };

  const handleTestConnection = async (accountId: string) => {
    try {
      const result = await api.testScrapingAccount(accountId);
      alert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
      loadAccounts();
    } catch (error: any) {
      alert(`❌ Test failed: ${error.message}`);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      await api.setDefaultScrapingAccount(accountId);
      alert('Default account updated!');
      loadAccounts();
    } catch (error: any) {
      alert(error.message || 'Failed to set default');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await api.deleteScrapingAccount(accountId);
      alert('Account deleted!');
      loadAccounts();
    } catch (error: any) {
      alert(error.message || 'Failed to delete account');
    }
  };

  const resetForm = () => {
    setAccountName('');
    setEmail('');
    setPassword('');
    setCookiesJson('');
    setProxyHost('');
    setProxyPort('');
    setProxyUsername('');
    setProxyPassword('');
  };

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      linkedin: '🔗',
      google: '🔍',
      facebook: '📘',
      instagram: '📷',
      twitter: '🐦',
    };
    return icons[platform] || '🌐';
  };

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || colors.inactive}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Scraping Accounts</h1>
          <p className="text-gray-600 mt-1">
            Manage platform credentials for authenticated data collection
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Account
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">🔒 Secure Credential Storage</h3>
        <p className="text-sm text-blue-800">
          All credentials are encrypted using AES-256-GCM encryption before storage.
          We recommend using LinkedIn cookies exported from your browser for maximum security.
        </p>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-xl font-semibold mb-2">No Accounts Added</h3>
          <p className="text-gray-600 mb-4">
            Add your LinkedIn or Google accounts to enable authenticated scraping
            and bypass bot detection.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{getPlatformIcon(account.platform)}</div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{account.accountName}</h3>
                      {account.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 capitalize">
                      {account.platform} • {account.accountType.replace('_', ' ')}
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      {getStatusBadge(account.status)}
                      {account.lastVerified && (
                        <span className="text-xs text-gray-500">
                          Last verified: {new Date(account.lastVerified).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTestConnection(account.id)}
                    className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
                  >
                    Test
                  </button>
                  {!account.isDefault && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add Scraping Account</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Platform Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook (Coming Soon)</option>
                </select>
              </div>

              {/* Account Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., My LinkedIn Account"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              {/* Account Type Tabs */}
              <div className="mb-6">
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setAccountType('cookies')}
                    className={`px-4 py-2 rounded font-medium ${accountType === 'cookies' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    🍪 Browser Cookies (Recommended)
                  </button>
                  <button
                    onClick={() => setAccountType('credentials')}
                    className={`px-4 py-2 rounded font-medium ${accountType === 'credentials' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    🔑 Email & Password
                  </button>
                </div>

                {accountType === 'cookies' ? (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      LinkedIn Cookies (JSON)
                    </label>
                    <textarea
                      value={cookiesJson}
                      onChange={(e) => setCookiesJson(e.target.value)}
                      placeholder={'{\n  "li_at": "your_li_at_cookie",\n  "JSESSIONID": "your_jsessionid_cookie"\n}'}
                      className="w-full px-3 py-2 border rounded font-mono text-sm"
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      📌 Export cookies from your browser using EditThisCookie extension or similar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      ⚠️ Note: Some platforms may require 2FA. Cookies are more reliable.
                    </p>
                  </div>
                )}
              </div>

              {/* Proxy Configuration (Optional) */}
              <details className="mb-6">
                <summary className="cursor-pointer font-medium mb-4">
                  🔀 Advanced: Proxy Configuration (Optional)
                </summary>
                <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Proxy Host</label>
                      <input
                        type="text"
                        value={proxyHost}
                        onChange={(e) => setProxyHost(e.target.value)}
                        placeholder="proxy.example.com"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Port</label>
                      <input
                        type="number"
                        value={proxyPort}
                        onChange={(e) => setProxyPort(e.target.value)}
                        placeholder="8080"
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Username (Optional)</label>
                      <input
                        type="text"
                        value={proxyUsername}
                        onChange={(e) => setProxyUsername(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Password (Optional)</label>
                      <input
                        type="password"
                        value={proxyPassword}
                        onChange={(e) => setProxyPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
