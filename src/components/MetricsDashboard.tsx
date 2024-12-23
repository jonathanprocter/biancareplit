import React, { useEffect, useState } from 'react';

import { useMetrics } from '../hooks/useMetrics';
import { AlertNotifications } from './AlertNotifications';

interface Alert {
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

export const MetricsDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { metrics } = useMetrics();

  useEffect(() => {
    if (metrics) {
      const { cpu_usage, memory_usage } = metrics;
      const newAlerts: Alert[] = [];

      if (cpu_usage > 80) {
        newAlerts.push({
          type: 'CPU Warning',
          message: `High CPU usage: ${cpu_usage}%`,
          severity: 'warning',
          timestamp: new Date().toISOString(),
        });
      }
      if (memory_usage > 85) {
        newAlerts.push({
          type: 'Memory Warning',
          message: `High memory usage: ${memory_usage}%`,
          severity: 'warning',
          timestamp: new Date().toISOString(),
        });
      }

      if (newAlerts.length) {
        setAlerts((prev) => [...prev, ...newAlerts]);
      }
    }
  }, [metrics]);

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">CPU Usage</h3>
          <div className="text-2xl">{metrics?.cpu_usage?.toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
          <div className="text-2xl">{metrics?.memory_usage?.toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Disk Usage</h3>
          <div className="text-2xl">{metrics?.disk_usage?.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">System Alerts</h2>
        <AlertNotifications alerts={alerts} />
      </div>
    </div>
  );
};
