import React from 'react';

interface Alert {
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

interface AlertNotificationsProps {
  alerts: Alert[];
}

export const AlertNotifications: React.FC<AlertNotificationsProps> = ({ alerts }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'warning':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900';
    }
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => (
        <div key={index} className={`p-4 border-l-4 rounded ${getSeverityColor(alert.severity)}`}>
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
