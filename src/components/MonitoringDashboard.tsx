import { useQuery } from 'react-query';

import React, { useEffect, useState } from 'react';

interface MetricsData {
  cpu_usage: number;
  memory_usage: number;
  request_count: number;
  response_time: number;
}

interface Alert {
  type: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  severity: 'warning' | 'critical';
}

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/monitoring/metrics')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setMetricsLoading(false);
      })
      .catch((error) => {
        console.error('There has been a problem with your fetch operation:', error);
      });
  }, []);

  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>(
    'alerts',
    () =>
      fetch('/api/monitoring/alerts').then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      }),
    { refetchInterval: 10000 },
  );

  if (metricsLoading || alertsLoading) {
    return <div>Loading monitoring data...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">System Monitoring</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">CPU Usage</h3>
          <div className="text-2xl">{metrics?.cpu_usage.toFixed(1)}%</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Memory Usage</h3>
          <div className="text-2xl">{(metrics?.memory_usage / 1024 / 1024).toFixed(1)} MB</div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Active Alerts</h3>
        <div className="space-y-2">
          {alerts?.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded ${
                alert.severity === 'critical' ? 'bg-red-100' : 'bg-yellow-100'
              }`}
            >
              <div className="font-medium">
                {alert.type}: {alert.metric}
              </div>
              <div className="text-sm">
                Current: {alert.value} (Threshold: {alert.threshold})
              </div>
              <div className="text-xs text-gray-600">
                {new Date(alert.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
