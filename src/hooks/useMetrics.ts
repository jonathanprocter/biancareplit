import { useEffect, useState } from 'react';

import useWebSocket from './useWebSocket';

interface Metrics {
  timestamp: string;
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
}

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { lastMessage } = useWebSocket('/ws/metrics');

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        setMetrics(data);
      } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', err); {
        console.error('Error parsing metrics:', err);
      }
    }
  }, [lastMessage]);

  return metrics;
}
