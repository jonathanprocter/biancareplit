import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { DeploymentChecker } from '@/utils/deploymentChecker';

interface DeploymentStatus {
  ready: boolean;
  issues: string[];
}

export const DeploymentVerification = () => {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);

  useEffect(() => {
    const checker = new DeploymentChecker();

    const verifyDeployment = async () => {
      try {
        const status = await checker.verifyDeployment();
        setDeploymentStatus(status);
      } catch (error) {
        console.error(
          'Deployment verification failed:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        setDeploymentStatus({
          ready: false,
          issues: ['Failed to complete deployment verification'],
        });
      }
    };

    void verifyDeployment();
  }, []);

  if (!deploymentStatus) {
    return <div>Verifying deployment status...</div>;
  }

  return (
    <div className="space-y-4">
      {!deploymentStatus.ready ? (
        <Alert variant="destructive">
          <AlertTitle>Deployment Issues Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {deploymentStatus.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Deployment Ready</AlertTitle>
          <AlertDescription>All deployment checks passed successfully.</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DeploymentVerification;
