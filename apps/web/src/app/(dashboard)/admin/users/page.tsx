'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    Promise.all([
      api.getAdminUsers(),
      api.getAdminUserStatistics(),
    ]).then(([usersData, statsData]) => {
      setUsers(usersData.users || usersData || []);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspend this user?')) return;
    try {
      await api.suspendUser(userId);
      alert('User suspended');
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'SUSPENDED' } : u));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleEnable = async (userId: string) => {
    try {
      await api.enableUser(userId);
      alert('User enabled');
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'ACTIVE' } : u));
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await api.deleteUser(userId);
      alert('User deleted');
      setUsers(users.filter(u => u.id !== userId));
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage users, roles, and permissions
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers || users.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeUsers || users.filter(u => u.status === 'ACTIVE').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Suspended</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.suspendedUsers || users.filter(u => u.status === 'SUSPENDED').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
            <p className="text-2xl font-bold text-blue-600">{stats.adminUsers || users.filter(u => u.role === 'ADMIN').length}</p>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'USER' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded ${
                    u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    u.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {u.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {u.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleSuspend(u.id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEnable(u.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Enable
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">No users found</div>
        )}
      </div>
    </div>
  );
}
