'use client';

import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar: string;
  joinedAt: string;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export default function TeamsPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');

  const [members] = useState<TeamMember[]>([
    { id: '1', name: 'Mohamed Saber', email: 'mohamed@usamko.com', role: 'admin', avatar: 'M', joinedAt: '2026-01-15' },
    { id: '2', name: 'Sarah Ahmed', email: 'sarah@usamko.com', role: 'editor', avatar: 'S', joinedAt: '2026-03-20' },
    { id: '3', name: 'Ali Hassan', email: 'ali@usamko.com', role: 'editor', avatar: 'A', joinedAt: '2026-05-10' },
    { id: '4', name: 'Nour Ibrahim', email: 'nour@usamko.com', role: 'viewer', avatar: 'N', joinedAt: '2026-07-01' },
    { id: '5', name: 'Youssef Khaled', email: 'youssef@usamko.com', role: 'viewer', avatar: 'Y', joinedAt: '2026-08-05' },
  ]);

  const [activity] = useState<ActivityItem[]>([
    { id: '1', user: 'Mohamed Saber', action: 'Updated team permissions', timestamp: '2 hours ago' },
    { id: '2', user: 'Sarah Ahmed', action: 'Published a new campaign', timestamp: '5 hours ago' },
    { id: '3', user: 'Ali Hassan', action: 'Connected Instagram account', timestamp: '1 day ago' },
    { id: '4', user: 'Nour Ibrahim', action: 'Viewed analytics report', timestamp: '2 days ago' },
    { id: '5', user: 'Mohamed Saber', action: 'Invited Youssef Khaled to the team', timestamp: '3 days ago' },
  ]);

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return styles[role] || styles.viewer;
  };

  const handleInvite = () => {
    // Mock invite action
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('viewer');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your team members and permissions
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              + Invite Member
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Team Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Members ({members.length})
          </h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.avatar}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getRoleBadge(member.role)}`}>
                    {member.role}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
                    Joined {member.joinedAt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Activity Log</h2>
          <div className="space-y-3">
            {activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{item.user}</span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{item.action}</span>
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                  {item.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invite Team Member
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
