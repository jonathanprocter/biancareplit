import React, { useMemo } from 'react';

interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

interface AlertNotificationsProps {
  alerts: Alert[];
}

export const AlertNotifications: React.FC<AlertNotificationsProps> = ({ alerts }) => {
  const alertsWithSeverityColor = useMemo(
    () =>
      alerts.map((alert) => ({
        ...alert,
        severityColor: getSeverityColor(alert.severity),
      })),
    [alerts],
  );

  return (
    <div className="space-y-2">
      {alertsWithSeverityColor.map((alert) => (
        <div key={alert.id} className={`p-4 border-l-4 rounded ${alert.severityColor}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{alert.type}</h3>
              <p className="text-sm">{alert.message}</p>
            </div>
            <span className="text-xs">{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

function getSeverityColor(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 border-red-500 text-red-900';
    case 'warning':
      return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    default:
      return 'bg-blue-100 border-blue-500 text-blue-900';
  }
}
