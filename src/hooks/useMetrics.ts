import { useEffect, useState } from 'react';

import useWebSocket from './useWebSocket';

interface MetricsData {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
}

interface Metrics {
  timestamp: string;
  metrics: MetricsData;
}

export function useMetrics(): Metrics | null {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { lastMessage } = useWebSocket('/ws/metrics');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data: Metrics = JSON.parse(lastMessage.data);
        if (data?.metrics) {
          setMetrics(data);
        }
      } catch (err) {
        console.error(
          'Error parsing metrics data:',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    }
  }, [lastMessage]);

  return metrics;
}
