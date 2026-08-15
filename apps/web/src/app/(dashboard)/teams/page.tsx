'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TeamsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersData, logsData] = await Promise.all([
        api.getTeamMembers(),
        api.getTeamActivityLogs(),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : membersData.members || []);
      setActivityLogs(Array.isArray(logsData) ? logsData : logsData.logs || []);
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    try {
      await api.inviteTeamMember({ email: inviteEmail, role: inviteRole });
      alert('Invitation sent');
      setShowInvite(false);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    try {
      await api.updateTeamMemberRole(memberId, role);
      alert('Role updated');
      loadData();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await api.removeTeamMember(memberId);
      alert('Member removed');
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your team members and permissions
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
        >
          + Invite Member
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invite Team Member</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
              >
                Send Invitation
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members ({members.length})</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.user?.name || member.name}
                    </div>
                    <div className="text-sm text-gray-500">{member.user?.email || member.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="text-center py-12 text-gray-500">No team members yet</div>
        )}
      </div>

      {/* Activity Log */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {activityLogs.slice(0, 10).map((log, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-xs">•</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">{log.action || log.description}</p>
                <p className="text-xs text-gray-500">
                  {log.user?.name || log.username || 'Unknown'} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          ))}
          {activityLogs.length === 0 && (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
