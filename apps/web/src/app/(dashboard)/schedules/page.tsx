'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    api.getSchedules()
      .then(data => {
        setSchedules(Array.isArray(data) ? data : data.schedules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Schedules</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage workflow and campaign schedules
        </p>
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
          <div className="text-center py-12 text-gray-500">No schedules configured</div>
        )}
      </div>
    </div>
  );
}
