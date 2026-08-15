'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'schedules'>('reports');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reportsData, schedulesData] = await Promise.all([
        api.getReports(),
        api.getScheduledReports(),
      ]);
      setReports(Array.isArray(reportsData) ? reportsData : reportsData.reports || []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : schedulesData.schedules || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCampaignReport = async () => {
    const campaignId = prompt('Enter campaign ID:');
    if (!campaignId) return;
    try {
      await api.generateCampaignReport(campaignId);
      alert('Report generation started');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleGeneratePlatformReport = async () => {
    const platform = prompt('Enter platform (facebook/instagram/linkedin/twitter):');
    if (!platform) return;
    try {
      await api.generatePlatformReport(platform);
      alert('Report generation started');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleGenerateEngagementReport = async () => {
    try {
      await api.generateEngagementReport();
      alert('Report generation started');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await api.downloadReport(id);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.pdf`;
      a.click();
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await api.deleteReport(id);
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      await api.toggleReportSchedule(id);
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await api.deleteReportSchedule(id);
      loadData();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Generate and schedule reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateCampaignReport}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm"
          >
            Campaign Report
          </button>
          <button
            onClick={handleGeneratePlatformReport}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm"
          >
            Platform Report
          </button>
          <button
            onClick={handleGenerateEngagementReport}
            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm"
          >
            Engagement Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {['reports', 'schedules'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Generated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {report.name || report.title || `Report ${report.id}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleDownload(report.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && (
            <div className="text-center py-12 text-gray-500">No reports generated yet</div>
          )}
        </div>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Frequency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Status
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
                    {schedule.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{schedule.frequency}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleToggleSchedule(schedule.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      {schedule.isActive ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
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
            <div className="text-center py-12 text-gray-500">No scheduled reports</div>
          )}
        </div>
      )}
    </div>
  );
}
