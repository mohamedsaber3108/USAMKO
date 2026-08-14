'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CampaignMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchCampaignStatus();
    }
  }, [params.id]);

  // Auto-refresh every 2 seconds when execution is running
  useEffect(() => {
    if (!autoRefresh || !execution || execution.status === 'completed' || execution.status === 'cancelled') {
      return;
    }

    const interval = setInterval(() => {
      fetchCampaignStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh, execution]);

  const fetchCampaignStatus = async () => {
    try {
      // Fetch campaign details
      const campaignRes = await fetch(`/api/campaigns/${params.id}`);
      if (campaignRes.ok) {
        const campaignData = await campaignRes.json();
        setCampaign(campaignData);
      }

      // Fetch latest execution
      const executionsRes = await fetch(`/api/campaigns/${params.id}/executions`);
      if (executionsRes.ok) {
        const executionsData = await executionsRes.json();
        if (executionsData.executions && executionsData.executions.length > 0) {
          setExecution(executionsData.executions[0]); // Latest execution
        }
      }
    } catch (error) {
      console.error('Failed to fetch campaign status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await fetch(`/api/campaigns/${params.id}/pause`, { method: 'POST' });
      fetchCampaignStatus();
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  const handleResume = async () => {
    try {
      await fetch(`/api/campaigns/${params.id}/execute`, { method: 'POST' });
      fetchCampaignStatus();
    } catch (error) {
      console.error('Failed to resume campaign:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this campaign execution?')) return;

    try {
      await fetch(`/api/campaigns/${params.id}/cancel`, { method: 'POST' });
      fetchCampaignStatus();
    } catch (error) {
      console.error('Failed to cancel campaign:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading campaign execution...</div>;
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <p>Campaign not found</p>
        <Link href="/campaigns" className="text-blue-600 hover:underline">Back to campaigns</Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = () => {
    if (!execution) return 0;
    const total = execution.totalTargets || 100;
    const processed = (execution.sent || 0) + (execution.failed || 0) + (execution.skipped || 0);
    return Math.round((processed / total) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/campaigns" className="text-blue-600 hover:underline">&larr; Back to Campaigns</Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
            <p className="text-gray-600">{campaign.description || 'No description'}</p>
          </div>
          {execution && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(execution.status)}`}>
              {execution.status.toUpperCase()}
            </span>
          )}
        </div>

        {/* Control Buttons */}
        {execution && execution.status === 'running' && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Pause
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
            <label className="flex items-center gap-2 ml-auto">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
          </div>
        )}

        {execution && execution.status === 'paused' && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Resume
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {execution ? (
        <>
          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Execution Progress</h2>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    {progress}% Complete
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-gray-600">
                    {(execution.sent || 0) + (execution.failed || 0) + (execution.skipped || 0)} / {execution.totalTargets || 0}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${progress}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                ></div>
              </div>
            </div>

            {/* Time Information */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <div className="text-sm text-gray-500">Started</div>
                <div className="font-semibold">
                  {execution.startedAt ? new Date(execution.startedAt).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-semibold">
                  {execution.startedAt ?
                    Math.round((new Date().getTime() - new Date(execution.startedAt).getTime()) / 1000) + 's'
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Completed</div>
                <div className="font-semibold">
                  {execution.completedAt ? new Date(execution.completedAt).toLocaleTimeString() : 'In Progress'}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Total Targets</div>
              <div className="text-3xl font-bold">{execution.totalTargets || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Sent</div>
              <div className="text-3xl font-bold text-green-600">{execution.sent || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Failed</div>
              <div className="text-3xl font-bold text-red-600">{execution.failed || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-500 mb-1">Skipped</div>
              <div className="text-3xl font-bold text-gray-600">{execution.skipped || 0}</div>
            </div>
          </div>

          {/* Messages Log */}
          {execution.messages && execution.messages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Messages</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {execution.messages.map((msg: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{msg.targetName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{msg.platform} - {msg.content?.substring(0, 50)}...</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      msg.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {msg.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">No execution data available</p>
          <button
            onClick={handleResume}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Execution
          </button>
        </div>
      )}
    </div>
  );
}
