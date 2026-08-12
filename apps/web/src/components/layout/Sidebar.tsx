'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Globe,
  BarChart3,
  FileText,
  Workflow,
  Sparkles,
  Settings,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/platforms', label: 'Platforms', icon: Globe },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/ai-content', label: 'AI Content', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white md:hidden"
        aria-label="Toggle sidebar"
      >
        {collapsed ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setCollapsed(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 text-gray-100 flex flex-col
          transition-transform duration-200 ease-in-out
          ${collapsed ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
          <span className="text-xl font-bold text-white">USAMKO</span>
          <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">v2</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname?.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setCollapsed(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-colors duration-150
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                    `}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800 p-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
