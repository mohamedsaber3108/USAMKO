'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Report {
  id: string;
  name: string;
  type: 'campaign' | 'platform' | 'engagement';
  format: 'pdf' | 'excel' | 'csv';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  type: 'campaign' | 'platform' | 'engagement';
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  nextRunAt: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generated' | 'scheduled'>('generated');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  // Report templates
  const reportTemplates = [
    { id: 'campaign', name: 'Campaign Report', description: 'Detailed campaign performance metrics' },
    { id: 'platform', name: 'Platform Report', description: 'Platform-specific analytics' },
    { id: 'engagement', name: 'Engagement Report', description: 'Overall engagement statistics' },
  ];

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    fetchReports();
    fetchScheduledReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Mock data for now
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Summer Campaign - July 2024',
          type: 'campaign',
          format: 'pdf',
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Instagram Platform - Weekly',
          type: 'platform',
          format: 'excel',
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Engagement Summary - June',
          type: 'engagement',
          format: 'pdf',
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
      ];
      setReports(mockReports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledReports = async () => {
    try {
      // Mock data for now
      const mockScheduled: ScheduledReport[] = [
        {
          id: '1',
          name: 'Daily Campaign Report',
          type: 'campaign',
          frequency: 'daily',
          enabled: true,
          nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          name: 'Weekly Platform Analysis',
          type: 'platform',
          frequency: 'weekly',
          enabled: true,
          nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setScheduledReports(mockScheduled);
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      generating: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getFrequencyColor = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-blue-100 text-blue-800',
      weekly: 'bg-purple-100 text-purple-800',
      monthly: 'bg-orange-100 text-orange-800',
    };
    return colors[frequency] || 'bg-gray-100 text-gray-800';
  };

  const handleGenerateReport = async (templateId: string) => {
    try {
      // In production, call the API endpoint
      const report: Report = {
        id: Date.now().toString(),
        name: `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Report - ${new Date().toLocaleDateString()}`,
        type: templateId as any,
        format: 'pdf',
        status: 'completed',
        createdAt: new Date().toISOString(),
      };
      setReports([report, ...reports]);
      alert(`Report generated successfully!`);
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      // In production, call the download API endpoint
      const response = await fetch(`/api/reports/${report.id}/download?format=${exportFormat}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report');
    }
  };

  const handleScheduleReport = async (templateId: string, frequency: 'daily' | 'weekly' | 'monthly') => {
    try {
      // In production, call the schedule API endpoint
      const scheduled: ScheduledReport = {
        id: Date.now().toString(),
        name: `${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Report - ${frequency}`,
        type: templateId as any,
        frequency,
        enabled: true,
        nextRunAt: new Date(Date.now() + (frequency === 'daily' ? 24 : frequency === 'weekly' ? 7 * 24 : 30 * 24) * 60 * 60 * 1000).toISOString(),
      };
      setScheduledReports([scheduled, ...scheduledReports]);
      alert(`Report scheduled for ${frequency} delivery!`);
    } catch (error) {
      console.error('Failed to schedule report:', error);
      alert('Failed to schedule report');
    }
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    try {
      // In production, call the toggle API endpoint
      setScheduledReports(scheduledReports.map(s => 
        s.id === id ? { ...s, enabled } : s
      ));
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      // In production, call the delete API endpoint
      setScheduledReports(scheduledReports.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Reports
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Generate and manage your analytics reports
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Generate New Report
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {reportTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {template.description}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleGenerateReport(template.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Generate
                  </button>
                  <select
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    onChange={(e) => handleScheduleReport(template.id, e.target.value as any)}
                    defaultValue=""
                  >
                    <option value="" disabled>Schedule...</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('generated')}
              className={`${
                activeTab === 'generated'
                  ? 'border-blue-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Generated Reports
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`${
                activeTab === 'scheduled'
                  ? 'border-blue-500 text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Scheduled Reports
            </button>
          </nav>
        </div>

        {/* Generated Reports */}
        {activeTab === 'generated' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-gray-500">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  No reports yet
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Generate a report to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Format
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reports.map(report => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {report.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {report.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 uppercase">
                          {report.format}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                              report.status,
                            )}`}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowPreviewModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(report)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Scheduled Reports */}
        {activeTab === 'scheduled' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            {scheduledReports.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  No scheduled reports
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Schedule a report to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Frequency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Next Run
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {scheduledReports.map(report => (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {report.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {report.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getFrequencyColor(
                              report.frequency,
                            )}`}
                          >
                            {report.frequency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(report.nextRunAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              report.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {report.enabled ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => toggleSchedule(report.id, !report.enabled)}
                            className={`mr-4 ${
                              report.enabled
                                ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400'
                                : 'text-green-600 hover:text-green-900 dark:text-green-400'
                            }`}
                          >
                            {report.enabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => deleteSchedule(report.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Preview Modal */}
      {showPreviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setShowPreviewModal(false)}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                  Preview Report: {selectedReport.name}
                </h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select export format:
                  </p>
                  <div className="flex gap-2 mb-4">
                    {(['pdf', 'excel', 'csv'] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          exportFormat === format
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Report preview would be displayed here with charts and data tables.
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedReport) handleDownload(selectedReport);
                    setShowPreviewModal(false);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Download {exportFormat.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}