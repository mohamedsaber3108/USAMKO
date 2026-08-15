'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export default function AdminHealthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<any>(null);
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [redisHealth, setRedisHealth] = useState<any>(null);
  const [aiHealth, setAiHealth] = useState<any>(null);
  const [dataHealth, setDataHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    Promise.all([
      api.healthCheck(),
      api.healthDb(),
      api.healthRedis(),
      api.getAiHealth(),
      api.getDataHealth(),
    ]).then(([h, db, redis, ai, data]) => {
      setHealth(h);
      setDbHealth(db);
      setRedisHealth(redis);
      setAiHealth(ai);
      setDataHealth(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const HealthCard = ({ title, status, details }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'healthy' || status === 'ok' || status === true
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {status === true || status === 'ok' || status === 'healthy' ? 'Healthy' : 'Unhealthy'}
        </span>
      </div>
      {details && (
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Health</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Monitor system components and services
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <HealthCard
          title="API Server"
          status={health?.status || 'ok'}
          details={{
            uptime: health?.uptime ? `${Math.floor(health.uptime / 1000)}s` : 'N/A',
            version: health?.version || 'Unknown',
            timestamp: health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-',
          }}
        />

        <HealthCard
          title="Database (PostgreSQL)"
          status={dbHealth?.status || dbHealth?.connected}
          details={{
            connected: dbHealth?.connected ? 'Yes' : 'No',
            latency: dbHealth?.latency ? `${dbHealth.latency}ms` : 'N/A',
          }}
        />

        <HealthCard
          title="Redis Cache"
          status={redisHealth?.status || redisHealth?.connected}
          details={{
            connected: redisHealth?.connected ? 'Yes' : 'No',
            latency: redisHealth?.latency ? `${redisHealth.latency}ms` : 'N/A',
          }}
        />

        <HealthCard
          title="AI Service"
          status={aiHealth?.status || aiHealth?.available}
          details={{
            provider: aiHealth?.provider || 'Unknown',
            modelsAvailable: aiHealth?.modelsAvailable || aiHealth?.models?.length || 0,
          }}
        />

        <HealthCard
          title="Data Orchestration"
          status={dataHealth?.status || dataHealth?.available}
          details={{
            sourcesActive: dataHealth?.sourcesActive || 0,
            cacheHitRate: dataHealth?.cacheHitRate || '0%',
          }}
        />
      </div>
    </div>
  );
}
