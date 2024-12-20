import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';

interface ConnectionState {
  wsConnected: boolean;
  apiConnected: boolean;
  latency: number;
  networkType: string | null;
  reconnecting: boolean;
  lastError: string | null;
}

interface ConnectionContextType extends ConnectionState {
  checkConnection: () => Promise<boolean>;
  resetConnection: () => void;
  connectionQuality: 'good' | 'fair' | 'poor';
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ConnectionState>({
    wsConnected: false,
    apiConnected: false,
    latency: 0,
    networkType: null,
    reconnecting: false,
    lastError: null,
  });

  const { isConnected: wsConnected, sendMessage } = useWebSocket(
    'ws://localhost:8082/ws',
    {
      onMessage: data => handleWebSocketMessage(data),
      reconnectAttempts: 5,
      reconnectInterval: 3000,
    }
  );

  const { request } = useApi();

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      const updateNetworkType = () => {
        setState(prev => ({ ...prev, networkType: connection.effectiveType }));
      };
      connection.addEventListener('change', updateNetworkType);
      updateNetworkType();
      return () => connection.removeEventListener('change', updateNetworkType);
    }
  }, []);

  useEffect(() => {
    const checkLatency = async () => {
      if (state.apiConnected) {
        const start = Date.now();
        try {
          await request('/health');
          const latency = Date.now() - start;
          setState(prev => ({ ...prev, latency }));
        } catch (error) {
          console.error('Latency check failed:', error);
        }
      }
    };

    const interval = setInterval(checkLatency, 30000);
    return () => clearInterval(interval);
  }, [state.apiConnected, request]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'connection_status':
        setState(prev => ({
          ...prev,
          wsConnected: data.connected,
          lastError: data.error || null,
        }));
        break;
      case 'latency':
        setState(prev => ({ ...prev, latency: data.value }));
        break;
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, reconnecting: true }));

      const apiResult = await request('/health');
      const apiConnected = !!apiResult;

      if (wsConnected) {
        sendMessage({ type: 'ping' });
      }

      setState(prev => ({
        ...prev,
        apiConnected,
        reconnecting: false,
        lastError: null,
      }));

      return apiConnected && wsConnected;
    } catch (error) {
      setState(prev => ({
        ...prev,
        reconnecting: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }));
      return false;
    }
  };

  const resetConnection = () => {
    window.location.reload();
  };

  const getConnectionQuality = (): 'good' | 'fair' | 'poor' => {
    if (!state.apiConnected || !state.wsConnected) return 'poor';
    if (state.latency < 100) return 'good';
    if (state.latency < 300) return 'fair';
    return 'poor';
  };

  return (
    <ConnectionContext.Provider
      value={{
        ...state,
        checkConnection,
        resetConnection,
        connectionQuality: getConnectionQuality(),
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
