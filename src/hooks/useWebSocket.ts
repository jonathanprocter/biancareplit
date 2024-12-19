import { useState, useEffect, useCallback } from 'react';

interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (data: any) => void;
  onMetricsUpdate?: (metrics: any) => void;
}

interface WebSocketMessage {
  type: 'metrics' | 'alert' | 'status';
  data: any;
  timestamp: string;
}

const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(options.reconnectAttempts || 3);
  const [reconnectInterval, setReconnectInterval] = useState(options.reconnectInterval || 5000);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(options.reconnectAttempts || 3);
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data as string);
      options.onMessage && options.onMessage(message);
      if (message.type === 'metrics') {
        options.onMetricsUpdate && options.onMetricsUpdate(message.data);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (reconnectAttempts > 0) {
        setTimeout(() => {
          setReconnectAttempts(reconnectAttempts - 1);
          connect();
        }, reconnectInterval);
      } else {
        console.error('WebSocket connection failed.');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    setSocket(ws);
  }, [url, options, reconnectAttempts, reconnectInterval, connect]);

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