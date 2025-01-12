import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';

import { SystemValidator } from '@/utils/systemValidator';

interface Props {
  onComplete?: () => void;
}

interface SystemStatus {
  success: boolean;
  failedChecks: string[];
  warnings: string[];
}

export const IntegrationMonitor: React.FC<Props> = ({ onComplete }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const validator = SystemValidator.getInstance();

    const checkSystem = async () => {
      try {
        const result = await validator.validateSystem();
        setStatus(result);
        if (result.success && onComplete) {
          onComplete();
          toast({
            title: 'System Check Complete',
            description: 'All systems operational.',
            variant: 'success',
          });
        } else if (!result.success) {
          toast({
            title: 'System Issues Detected',
            description: 'Please check the details.',
            variant: 'error',
          });
        }
      } catch (error) {
        console.error(
          'Validation failed:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        toast({
          title: 'System Check Failed',
          description: 'An unexpected error occurred.',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };

    void checkSystem();

    // Periodic checks
    const interval = setInterval(checkSystem, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [onComplete, toast]);

  if (loading) {
    return <div>Checking system status...</div>;
  }

  if (!status) {
    return <div>Unable to determine system status</div>;
  }

  return (
    <div className="space-y-4">
      {!status.success && (
        <Alert variant="destructive">
          <AlertTitle>System Issues Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {status.failedChecks.map((check) => (
                <li key={check}>{check} check failed</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {status.warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>System Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {status.warnings.map((warning) => (
                <li key={warning}>{warning} warning</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {status.success && status.warnings.length === 0 && (
        <Alert>
          <AlertTitle>All Systems Operational</AlertTitle>
          <AlertDescription>All integration checks passed successfully.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default IntegrationMonitor;
