'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function AdminRolesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    Promise.all([
      api.getRoles(),
      api.getAllPermissions(),
    ]).then(([rolesData, permsData]) => {
      setRoles(Array.isArray(rolesData) ? rolesData : rolesData.roles || []);
      setPermissions(Array.isArray(permsData) ? permsData : permsData.permissions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  const handleDelete = async (roleId: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await api.deleteRole(roleId);
      alert('Role deleted');
      setRoles(roles.filter(r => r.id !== roleId));
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage user roles and permissions
        </p>
      </div>

      {/* Roles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Roles</h3>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                <p className="text-sm text-gray-500">{role.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {role.permissions?.length || 0} permissions
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(role.id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Permissions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {permissions.map((perm) => (
            <div key={perm.id} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
              {perm.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
