'use client';

import { useState } from 'react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | NotificationType>('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'success', title: 'Campaign completed', message: 'Your "Summer Product Launch" campaign has finished successfully with 1,234 engagements.', timestamp: '10 minutes ago', read: false },
    { id: '2', type: 'warning', title: 'API rate limit approaching', message: 'You have used 85% of your daily API quota. Consider upgrading your plan.', timestamp: '1 hour ago', read: false },
    { id: '3', type: 'info', title: 'New team member joined', message: 'Youssef Khaled has accepted your invitation and joined the team as a viewer.', timestamp: '3 hours ago', read: false },
    { id: '4', type: 'error', title: 'Workflow failed', message: 'The "Auto-Post Newsletter" workflow failed due to an expired access token. Please reconnect your LinkedIn account.', timestamp: '5 hours ago', read: false },
    { id: '5', type: 'info', title: 'Scheduled maintenance', message: 'Platform maintenance is scheduled for August 15, 2026 from 2:00 AM to 4:00 AM UTC.', timestamp: '1 day ago', read: true },
    { id: '6', type: 'success', title: 'Platform connected', message: 'Your Instagram Business account has been successfully connected.', timestamp: '2 days ago', read: true },
    { id: '7', type: 'warning', title: 'Storage usage high', message: 'Your media storage is at 90% capacity. Consider archiving old assets.', timestamp: '3 days ago', read: true },
    { id: '8', type: 'error', title: 'Payment failed', message: 'We could not process your subscription payment. Please update your billing information.', timestamp: '4 days ago', read: true },
  ]);

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return (
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {(['all', 'info', 'success', 'warning', 'error'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No notifications to display</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 ${
                  notification.read ? 'opacity-70 border-gray-200 dark:border-gray-700' : 'border-blue-500'
                }`}
              >
                {getTypeIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {notification.timestamp}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="shrink-0 px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
