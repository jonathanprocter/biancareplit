import { useState, useEffect, useCallback } from 'react';

interface WebSocketOptions {
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (data: any) => void;
}

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const {
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onMessage
  } = options;

  const connect = useCallback(() => {
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setIsConnected(true);
      setReconnectCount(0);
    };

    socket.onclose = () => {
      setIsConnected(false);
      if (reconnectCount < reconnectAttempts) {
        setTimeout(() => {
          setReconnectCount(prev => prev + 1);
          connect();
        }, reconnectInterval);
      }
    };

    socket.onmessage = (event) => {
      if (onMessage) {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      }
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [url, reconnectCount, reconnectAttempts, reconnectInterval, onMessage]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((data: any) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(data));
    }
  }, [ws, isConnected]);

  return { isConnected, sendMessage, reconnectCount };
};
