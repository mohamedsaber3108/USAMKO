'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

interface Contact {
  firstName: string;
  profileUrl: string;
  status?: string;
}

interface Campaign {
  id: string;
  name: string;
  messageTemplate: string;
  contacts: Contact[];
  delayMin: number;
  delayMax: number;
  status: string;
  progress: number;
  totalSent: number;
  totalFailed: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function LinkedInSenderPage() {
  const [step, setStep] = useState<'setup' | 'contacts' | 'message' | 'review' | 'running'>('setup');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [cookiesInput, setCookiesInput] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hi {first_name},\n\nI came across your profile and would love to connect.\n\nBest regards');
  const [delayMin, setDelayMin] = useState(30);
  const [delayMax, setDelayMax] = useState(60);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkSession();
    loadCampaigns();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const checkSession = async () => {
    try {
      const session = await api.getActiveLinkedInSession();
      setSessionActive(!!session && session.isActive !== false);
    } catch {
      setSessionActive(false);
    } finally {
      setSessionLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await api.getSenderCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {}
  };

  const saveSession = async () => {
    if (!cookiesInput.trim()) {
      setError('Please paste your LinkedIn cookies (li_at value)');
      return;
    }
    setError('');
    try {
      await api.saveSenderSession({ cookies: cookiesInput.trim() });
      setSessionActive(true);
      setSuccess('LinkedIn session saved successfully!');
      setCookiesInput('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save session');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;

      // Parse CSV/TSV
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setError('File must have a header row and at least one data row');
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));

      const firstNameIdx = headers.findIndex(h => h === 'first_name' || h === 'firstname' || h === 'first name' || h === 'name');
      const urlIdx = headers.findIndex(h => h === 'profile_url' || h === 'profileurl' || h === 'url' || h === 'linkedin' || h === 'linkedin url' || h === 'profile url');

      if (firstNameIdx === -1 || urlIdx === -1) {
        setError('File must have columns: first_name (or name) and profile_url (or url/linkedin)');
        return;
      }

      const parsed: Contact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, ''));
        const firstName = values[firstNameIdx];
        const profileUrl = values[urlIdx];
        if (firstName && profileUrl) {
          parsed.push({ firstName, profileUrl });
        }
      }

      if (parsed.length === 0) {
        setError('No valid contacts found in file');
        return;
      }

      setContacts(parsed);
      setError('');
      setSuccess(`Loaded ${parsed.length} contacts from file`);
      setTimeout(() => setSuccess(''), 3000);
    };

    if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setError('Please export your Excel file as CSV first, then upload the CSV file');
    } else {
      setError('Unsupported file format. Use CSV or TSV.');
    }
  };

  const handleUseCollectedLeads = async () => {
    try {
      const data = await api.getLinkedInProfiles();
      const profiles = Array.isArray(data) ? data : data.profiles || [];
      if (profiles.length === 0) {
        setError('No collected LinkedIn profiles found. Collect leads first from the Leads page.');
        return;
      }
      const mapped: Contact[] = profiles.map((p: any) => ({
        firstName: p.firstName || p.name?.split(' ')[0] || 'there',
        profileUrl: p.profileUrl || p.linkedinUrl || `https://www.linkedin.com/in/${p.publicIdentifier}`,
      }));
      setContacts(mapped);
      setSuccess(`Loaded ${mapped.length} contacts from collected profiles`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to load profiles: ' + (err.message || 'Unknown error'));
    }
  };

  const removeContact = (index: number) => {
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const addManualContact = () => {
    setContacts(prev => [...prev, { firstName: '', profileUrl: '' }]);
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    setContacts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const createAndStartCampaign = async () => {
    if (!campaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }
    if (!messageTemplate.trim()) {
      setError('Please enter a message template');
      return;
    }
    if (contacts.length === 0) {
      setError('No contacts to send to');
      return;
    }

    setError('');
    try {
      const campaign = await api.createSenderCampaign({
        name: campaignName,
        messageTemplate,
        contacts,
        delayMin,
        delayMax,
      });

      setActiveCampaign(campaign);
      setStep('running');

      // Start it
      const result = await api.startSenderCampaign(campaign.id);
      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccess('Campaign started!');
      startPolling(campaign.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    }
  };

  const startPolling = (campaignId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await api.getSenderCampaignStatus(campaignId);
        if (status && activeCampaign) {
          setActiveCampaign(prev => prev ? { ...prev, ...status } : prev);
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'paused') {
            if (pollRef.current) clearInterval(pollRef.current);
            loadCampaigns();
          }
        }
      } catch {}
    }, 5000);
  };

  const pauseActiveCampaign = async () => {
    if (!activeCampaign) return;
    try {
      await api.pauseSenderCampaign(activeCampaign.id);
      setActiveCampaign(prev => prev ? { ...prev, status: 'paused' } : null);
      if (pollRef.current) clearInterval(pollRef.current);
    } catch {}
  };

  const messagePreview = contacts.length > 0
    ? messageTemplate.replace(/\{first_name\}/g, contacts[0].firstName).replace(/\{firstName\}/g, contacts[0].firstName).replace(/\{name\}/g, contacts[0].firstName)
    : messageTemplate;

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LinkedIn Message Sender</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Send personalized messages to your LinkedIn contacts automatically
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-700 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {['setup', 'contacts', 'message', 'review', 'running'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === s ? 'bg-blue-600 text-white' :
              ['setup', 'contacts', 'message', 'review', 'running'].indexOf(step) > i ? 'bg-green-500 text-white' :
              'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {i + 1}
            </div>
            {i < 4 && <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600"></div>}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500 capitalize">{step}</span>
      </div>

      {/* STEP 1: Session Setup */}
      {step === 'setup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LinkedIn Session</h3>

            {sessionActive ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 dark:text-green-300 font-medium">LinkedIn session is active</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-yellow-700 dark:text-yellow-300 font-medium mb-2">No active session</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    To send messages, you need to provide your LinkedIn session cookie (li_at value).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    LinkedIn Cookie (li_at)
                  </label>
                  <p className="text-xs text-gray-500">
                    Open LinkedIn in Chrome → F12 → Application → Cookies → linkedin.com → copy the &quot;li_at&quot; value
                  </p>
                  <textarea
                    value={cookiesInput}
                    onChange={(e) => setCookiesInput(e.target.value)}
                    placeholder="Paste your li_at cookie value here..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm h-24"
                  />
                  <button
                    onClick={saveSession}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium"
                  >
                    Save Session
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep('contacts')}
              disabled={!sessionActive}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-6 rounded-lg font-medium"
            >
              Next: Add Contacts →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Contacts */}
      {step === 'contacts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Import Contacts ({contacts.length} loaded)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Upload CSV */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
              >
                <div className="text-3xl mb-2">📄</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Upload CSV File</p>
                <p className="text-xs text-gray-500 mt-1">Columns: first_name, profile_url</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Use collected leads */}
              <div
                onClick={handleUseCollectedLeads}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
              >
                <div className="text-3xl mb-2">👥</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">From Collected Leads</p>
                <p className="text-xs text-gray-500 mt-1">Use profiles from Lead Collection</p>
              </div>

              {/* Add manually */}
              <div
                onClick={addManualContact}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition"
              >
                <div className="text-3xl mb-2">✏️</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Add Manually</p>
                <p className="text-xs text-gray-500 mt-1">Type in contacts one by one</p>
              </div>
            </div>

            {/* Contacts table */}
            {contacts.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">#</th>
                        <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">First Name</th>
                        <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Profile URL</th>
                        <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={c.firstName}
                              onChange={(e) => updateContact(i, 'firstName', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={c.profileUrl}
                              onChange={(e) => updateContact(i, 'profileUrl', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button onClick={() => removeContact(i)} className="text-red-500 hover:text-red-700">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('setup')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 py-2 px-4">
              ← Back
            </button>
            <button
              onClick={() => setStep('message')}
              disabled={contacts.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-6 rounded-lg font-medium"
            >
              Next: Write Message →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Message Template */}
      {step === 'message' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Message Template</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Outreach to tech founders"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">
                  Message Template
                </label>
                <p className="text-xs text-gray-500">
                  Use {'{first_name}'} to personalize. It will be replaced with each contact&apos;s name.
                </p>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm h-48"
                />

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Min delay (seconds)
                    </label>
                    <input
                      type="number"
                      value={delayMin}
                      onChange={(e) => setDelayMin(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Max delay (seconds)
                    </label>
                    <input
                      type="number"
                      value={delayMax}
                      onChange={(e) => setDelayMax(parseInt(e.target.value) || 60)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview (first contact)
                </label>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
                    {messagePreview}
                  </pre>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Will be sent to {contacts.length} contacts with {delayMin}-{delayMax}s delay between each
                </p>
                <p className="text-xs text-gray-500">
                  Estimated time: {Math.round((contacts.length * (delayMin + delayMax) / 2) / 60)} minutes
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('contacts')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 py-2 px-4">
              ← Back
            </button>
            <button
              onClick={() => setStep('review')}
              disabled={!messageTemplate.trim() || !campaignName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-6 rounded-lg font-medium"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Review & Launch */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Campaign</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Campaign Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{campaignName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Contacts</p>
                  <p className="font-medium text-gray-900 dark:text-white">{contacts.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delay Between Messages</p>
                  <p className="font-medium text-gray-900 dark:text-white">{delayMin}s - {delayMax}s</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Duration</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ~{Math.round((contacts.length * (delayMin + delayMax) / 2) / 60)} minutes
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Message Preview</p>
                <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-sans">
                    {messagePreview}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">Important Notes:</p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 list-disc ml-4 mt-1 space-y-1">
                <li>Messages are sent using your LinkedIn session — LinkedIn may flag excessive messaging</li>
                <li>Use reasonable delays (30-60s minimum) to appear natural</li>
                <li>You can only message your 1st-degree connections directly</li>
                <li>Campaign progress is tracked — you can pause and resume anytime</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('message')} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 py-2 px-4">
              ← Back
            </button>
            <button
              onClick={createAndStartCampaign}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-8 rounded-lg font-bold text-lg"
            >
              🚀 Launch Campaign
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Running */}
      {step === 'running' && activeCampaign && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Campaign: {activeCampaign.name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                activeCampaign.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                activeCampaign.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                activeCampaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {activeCampaign.status.toUpperCase()}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{activeCampaign.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${activeCampaign.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{activeCampaign.totalSent}</p>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{activeCampaign.totalFailed}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                  {contacts.length - activeCampaign.totalSent - activeCampaign.totalFailed}
                </p>
                <p className="text-sm text-gray-500">Remaining</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {activeCampaign.status === 'running' && (
                <button
                  onClick={pauseActiveCampaign}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-6 rounded-lg font-medium"
                >
                  ⏸ Pause Campaign
                </button>
              )}
              {(activeCampaign.status === 'completed' || activeCampaign.status === 'paused' || activeCampaign.status === 'failed') && (
                <button
                  onClick={() => { setStep('setup'); setActiveCampaign(null); loadCampaigns(); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium"
                >
                  ← New Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign History */}
      {step !== 'running' && campaigns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campaign History</h3>
          <div className="space-y-3">
            {campaigns.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {c.contacts?.length || 0} contacts · {c.totalSent} sent · {c.totalFailed} failed
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  c.status === 'completed' ? 'bg-green-100 text-green-700' :
                  c.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
