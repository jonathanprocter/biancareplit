import { useCallback, useEffect, useState } from 'react';

interface WebSocketMetrics {
  cpu: number;
  memory: number;
  activeConnections: number;
  requestsPerSecond: number;
}

interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (data: WebSocketMessage) => void;
  onMetricsUpdate?: (metrics: WebSocketMetrics) => void;
}

interface WebSocketMessage {
  type: 'metrics' | 'alert' | 'status';
  data: WebSocketMetrics | string;
  timestamp: string;
}

const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(options.reconnectAttempts || 3);
  const reconnectInterval = options.reconnectInterval || 5000;

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(options.reconnectAttempts || 3);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        options.onMessage?.(message);
        if (message.type === 'metrics' && options.onMetricsUpdate) {
          options.onMetricsUpdate(message.data as WebSocketMetrics);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (_event) => {
      setIsConnected(false);
      if (reconnectAttempts > 0) {
        setTimeout(() => {
          setReconnectAttempts(reconnectAttempts - 1);
          connect();
        }, options.reconnectInterval);
      } else {
        console.error('WebSocket connection failed.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    setSocket(ws);
  }, [url, options, reconnectAttempts]);

  useEffect(() => {
    connect();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [connect, socket]);

  return { isConnected };
};

export default useWebSocket;
