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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Create/Edit form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('USER');
  const [formExpiration, setFormExpiration] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminUserStatistics(),
      ]);
      setUsers(usersData.users || usersData || []);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formName || !formEmail || !formPassword) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const newUser = await api.register({
        name: formName,
        email: formEmail,
        password: formPassword,
      });

      // Update role if not USER
      if (formRole !== 'USER') {
        await api.updateUserRole(newUser.id, formRole);
      }

      // Set expiration if provided
      if (formExpiration) {
        await api.setUserExpiration(newUser.id, { expiresAt: new Date(formExpiration).toISOString() });
      }

      alert('User created successfully!');
      setShowCreateForm(false);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Failed to create user: ' + err.message);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      // Update role if changed
      if (formRole !== editingUser.role) {
        await api.updateUserRole(editingUser.id, formRole);
      }

      // Update expiration
      if (formExpiration) {
        await api.setUserExpiration(editingUser.id, { expiresAt: new Date(formExpiration).toISOString() });
      }

      alert('User updated successfully!');
      setEditingUser(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert('Failed to update user: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('USER');
    setFormExpiration('');
  };

  const openEditForm = (u: any) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormExpiration(u.expiresAt ? new Date(u.expiresAt).toISOString().slice(0, 16) : '');
    setShowCreateForm(true);
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspend this user?')) return;
    try {
      await api.suspendUser(userId);
      alert('User suspended');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleEnable = async (userId: string) => {
    try {
      await api.enableUser(userId);
      alert('User enabled');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await api.deleteUser(userId);
      alert('User deleted');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || (u.status || 'ACTIVE') === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete user lifecycle management
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            resetForm();
            setShowCreateForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Create User
        </button>
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

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={!!editingUser}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={!!editingUser}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50"
              />
            </div>

            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration Date (optional)
              </label>
              <input
                type="datetime-local"
                value={formExpiration}
                onChange={(e) => setFormExpiration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={editingUser ? handleEditUser : handleCreateUser}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {editingUser ? 'Update User' : 'Create User'}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingUser(null);
                resetForm();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Expires</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'USER' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded ${
                      u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      u.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {u.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(u)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Edit
                      </button>
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleSuspend(u.id)}
                          className="text-yellow-600 hover:text-yellow-900 text-sm"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(u.id)}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Enable
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
              ? 'No users match your filters'
              : 'No users found'}
          </div>
        )}
      </div>
    </div>
  );
}
