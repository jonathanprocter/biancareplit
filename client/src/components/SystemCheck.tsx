import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface SystemStatus {
  status: 'ok' | 'error';
  checks: {
    database: boolean;
    api: boolean;
    static: boolean;
    env: boolean;
    migrations: boolean;
  };
  details: {
    missingEnvVars?: string[];
    databaseError?: string;
    apiErrors?: string[];
    migrationErrors?: string[];
    timestamp: string;
  };
}

const SystemCheck: React.FC = () => {
  const { toast } = useToast();
  
  const { data: status, isLoading, error, refetch } = useQuery<SystemStatus>({
    queryKey: ['/api/system-check'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
    onError: (error) => {
      toast({
        title: 'System Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check system status',
        variant: 'destructive',
      });
    },
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to fetch system status
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Alert variant={status.status === 'ok' ? 'default' : 'destructive'}>
        <AlertTitle className="flex items-center">
          {status.status === 'ok' ? (
            <CheckCircle className="h-4 w-4 mr-2" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          System Status: {status.status.toUpperCase()}
          <span className="ml-auto text-sm text-muted-foreground">
            Last checked: {formatTime(status.details.timestamp)}
          </span>
        </AlertTitle>
      </Alert>
      
      {Object.entries(status.checks).map(([key, value]) => (
        <Alert key={key} variant={value ? 'default' : 'destructive'}>
          <AlertTitle className="flex items-center">
            {value ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </AlertTitle>
          {!value && (
            <AlertDescription>
              {status.details[`${key}Error`] || 
               (key === 'env' && status.details.missingEnvVars?.join(', ')) ||
               `${key} check failed`}
            </AlertDescription>
          )}
        </Alert>
      ))}

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
    </div>
  );
};

export default SystemCheck;
