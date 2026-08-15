'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      const params = filter === 'unread' ? { unread: 'true' } : {};
      const data = await api.getNotifications(params);
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      loadNotifications();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete all notifications?')) return;
    try {
      await api.deleteAllNotifications();
      loadNotifications();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'CAMPAIGN': return '📢';
      case 'LEAD': return '👤';
      case 'SYSTEM': return '⚙️';
      case 'WARNING': return '⚠️';
      case 'SUCCESS': return '✅';
      default: return '📬';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm"
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm"
            >
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
              !notification.isRead ? 'border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">{getIcon(notification.type)}</div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-2 text-lg">📬</p>
          <p className="text-gray-500">No notifications</p>
        </div>
      )}
    </div>
  );
}
