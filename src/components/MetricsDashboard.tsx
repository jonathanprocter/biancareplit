import React, { useState, useEffect } from 'react';
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
  const metrics = useMetrics();

  useEffect(() => {
    if (metrics) {
      // Check thresholds and generate alerts
      if (metrics.metrics.cpu_usage > 80) {
        setAlerts((prev) => [
          ...prev,
          {
            type: 'CPU Warning',
            message: `High CPU usage: ${metrics.metrics.cpu_usage}%`,
            severity: 'warning',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
      if (metrics.metrics.memory_usage > 85) {
        setAlerts((prev) => [
          ...prev,
          {
            type: 'Memory Warning',
            message: `High memory usage: ${metrics.metrics.memory_usage}%`,
            severity: 'warning',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
  }, [metrics]);

  return (
    <div className="p-4 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">CPU Usage</h3>
          <div className="text-2xl">{metrics?.metrics.cpu_usage.toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
          <div className="text-2xl">{metrics?.metrics.memory_usage.toFixed(1)}%</div>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Disk Usage</h3>
          <div className="text-2xl">{metrics?.metrics.disk_usage.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">System Alerts</h2>
        <AlertNotifications alerts={alerts} />
      </div>
    </div>
  );
};
