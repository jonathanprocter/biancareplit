import React from 'react';
import { useConnection } from '../context/ConnectionContext';

export const ConnectionStatus: React.FC = () => {
  const {
    wsConnected,
    apiConnected,
    latency,
    networkType,
    reconnecting,
    lastError,
    connectionQuality,
    checkConnection,
    resetConnection,
  } = useConnection();

  const getStatusColor = (quality: 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Connection Status</span>
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor(
              connectionQuality
            )}`}
          />
        </div>

        <div className="space-y-2 text-sm">
          <div>WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}</div>
          <div>API: {apiConnected ? 'Connected' : 'Disconnected'}</div>
          <div>Latency: {latency}ms</div>
          {networkType && <div>Network: {networkType}</div>}
          {lastError && <div className="text-red-600">Error: {lastError}</div>}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={checkConnection}
            disabled={reconnecting}
            className={`px-3 py-1 rounded text-sm ${
              reconnecting
                ? 'bg-gray-200 text-gray-500'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {reconnecting ? 'Checking...' : 'Check Connection'}
          </button>
          <button
            onClick={resetConnection}
            className="px-3 py-1 rounded text-sm bg-red-500 text-white hover:bg-red-600"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
