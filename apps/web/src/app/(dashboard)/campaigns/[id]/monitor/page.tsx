'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function CampaignMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    const interval = autoRefresh ? setInterval(loadData, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaignId, autoRefresh]);

  const loadData = async () => {
    try {
      const [campaignData, executionsData] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignExecutions(campaignId),
      ]);

      setCampaign(campaignData);

      // Get the most recent execution
      const executions = Array.isArray(executionsData) ? executionsData : executionsData.executions || [];
      if (executions.length > 0) {
        const latestExecution = executions[0];
        setExecution(latestExecution);

        // Try to get detailed logs
        try {
          const logsData = await api.getCampaignExecutionLogs(latestExecution.id);
          setLogs(Array.isArray(logsData) ? logsData : logsData.logs || []);
        } catch (err) {
          console.error('Failed to load logs:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load campaign data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      await api.pauseCampaign(campaignId);
      alert('Campaign paused');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleResume = async () => {
    try {
      await api.executeCampaign(campaignId);
      alert('Campaign resumed');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this campaign? This cannot be undone.')) return;
    try {
      await api.cancelCampaign(campaignId);
      alert('Campaign cancelled');
      router.push('/campaigns');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    );
  }

  const progress = execution?.progress || 0;
  const status = campaign.status || 'PENDING';
  const isRunning = status === 'ACTIVE' || status === 'RUNNING';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Campaign Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {campaign.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-white'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸ Auto-refresh OFF'}
          </button>
          <button
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
          >
            View Details
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-6 ${
        status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700' :
        status === 'FAILED' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700' :
        status === 'PAUSED' ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' :
        'bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold mb-2">
              Status: {status}
            </div>
            <div className="text-sm opacity-75">
              Started: {execution?.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Not started'}
            </div>
            {execution?.completedAt && (
              <div className="text-sm opacity-75">
                Completed: {new Date(execution.completedAt).toLocaleString()}
              </div>
            )}
          </div>
          <div className="text-5xl">
            {status === 'COMPLETED' ? '✅' :
             status === 'FAILED' ? '❌' :
             status === 'PAUSED' ? '⏸️' :
             '▶️'}
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Overall Progress
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completion</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {execution && (
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {execution.successCount || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {execution.failedCount || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {(execution.successCount || 0) + (execution.failedCount || 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Actions</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Breakdown */}
      {execution?.platformResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(execution.platformResults).map(([platform, result]: any) => (
              <div key={platform}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {platform}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {result.completed}/{result.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(result.completed / result.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Controls
        </h3>
        <div className="flex gap-4">
          {isRunning ? (
            <button
              onClick={handlePause}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              ⏸ Pause Campaign
            </button>
          ) : status === 'PAUSED' ? (
            <button
              onClick={handleResume}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              ▶️ Resume Campaign
            </button>
          ) : null}

          {status !== 'COMPLETED' && status !== 'FAILED' && (
            <button
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg"
            >
              ✕ Cancel Campaign
            </button>
          )}

          <button
            onClick={loadData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* Real-Time Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Execution Logs ({logs.length})
          </h3>
        </div>
        <div className="p-6">
          {logs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No logs available yet</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded text-sm font-mono ${
                    log.level === 'error' || log.status === 'failed'
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : log.level === 'warn'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                      : log.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs opacity-50">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--'}
                    </span>
                    <span className="flex-1">
                      [{log.platform || 'SYSTEM'}] {log.message || log.action || 'Unknown action'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Details */}
      {execution?.errors && execution.errors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-red-600">
              Errors ({execution.errors.length})
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {execution.errors.map((error: any, idx: number) => (
              <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="font-semibold text-red-700 dark:text-red-300 mb-1">
                  {error.platform || 'Unknown Platform'}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  {error.message || error.error || 'Unknown error'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
