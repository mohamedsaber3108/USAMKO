'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Monthly on 1st', value: '0 0 1 * *' },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [workflowId, setWorkflowId] = useState('');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [usePreset, setUsePreset] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    loadSchedules();
    loadWorkflows();
  }, []);

  const loadSchedules = () => {
    api.getSchedules()
      .then(data => {
        setSchedules(Array.isArray(data) ? data : data.schedules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadWorkflows = () => {
    api.getWorkflows()
      .then(data => {
        setWorkflows(Array.isArray(data) ? data : data.workflows || []);
      })
      .catch(() => {});
  };

  const handleCreate = async () => {
    if (!workflowId) {
      alert('Please select a workflow');
      return;
    }

    if (!cronExpression.trim()) {
      alert('Cron expression is required');
      return;
    }

    try {
      setCreating(true);
      await api.createSchedule({
        workflowId,
        cronExpression: cronExpression.trim(),
        enabled,
      });
      alert('Schedule created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadSchedules();
    } catch (err: any) {
      alert('Failed to create schedule: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setWorkflowId('');
    setCronExpression('0 9 * * *');
    setUsePreset(true);
    setEnabled(true);
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleSchedule(id);
      loadSchedules();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.deleteSchedule(id);
      loadSchedules();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Schedules</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage workflow and campaign schedules
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Create Schedule
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Cron
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Next Run
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {schedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                  {schedule.name || 'Unnamed Schedule'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                  {schedule.cronExpression || schedule.cron}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded ${
                    schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {schedule.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleToggle(schedule.id)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    {schedule.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No schedules configured</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first schedule
            </button>
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Create Schedule
            </h2>

            <div className="space-y-4">
              {/* Workflow Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workflow *
                </label>
                <select
                  value={workflowId}
                  onChange={(e) => setWorkflowId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Select a workflow</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
                {workflows.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    No workflows found. Create a workflow first.
                  </p>
                )}
              </div>

              {/* Cron Expression Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={usePreset}
                      onChange={() => setUsePreset(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Common Schedules
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={!usePreset}
                      onChange={() => setUsePreset(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Custom Cron Expression
                    </span>
                  </label>
                </div>
              </div>

              {/* Cron Expression */}
              {usePreset ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Schedule *
                  </label>
                  <select
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    {CRON_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label} ({preset.value})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cron Expression *
                  </label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 9 * * *"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: minute hour day month weekday (e.g., "0 9 * * *" = daily at 9 AM)
                  </p>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium mb-1">Examples:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li><code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">* * * * *</code> - Every minute</li>
                      <li><code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">0 * * * *</code> - Every hour</li>
                      <li><code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">0 0 * * *</code> - Daily at midnight</li>
                      <li><code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">0 0 * * 1</code> - Weekly on Monday</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Enabled Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700 dark:text-gray-300">
                  Enabled (start running immediately)
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !workflowId || !cronExpression.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
