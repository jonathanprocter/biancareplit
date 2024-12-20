import { useState } from 'react';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

interface ApiOptions extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
}

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const request = async <T>(url: string, options: ApiOptions = {}): Promise<T | null> => {
    const { retries = 3, retryDelay = 1000, ...axiosOptions } = options;

    setIsLoading(true);
    setError(null);

    let attempts = 0;

    while (attempts < retries) {
      try {
        const response = await axios(url, axiosOptions);
        setIsLoading(false);
        return response.data;
      } catch (err) {
        attempts++;
        const error = err as AxiosError;

        if (attempts === retries) {
          setError(error);
          setIsLoading(false);
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempts));
      }
    }

    return null;
  };

  return { request, isLoading, error };
};
