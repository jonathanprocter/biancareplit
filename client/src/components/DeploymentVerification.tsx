import { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { DeploymentChecker } from '@/utils/deploymentChecker';

interface DeploymentStatus {
  ready: boolean;
  issues: string[];
}

export function DeploymentVerification() {
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checker = new DeploymentChecker();

    const verifyDeployment = async () => {
      try {
        const status = await checker.verifyDeployment();
        setDeploymentStatus(status);
      } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
        console.error(
          'Deployment verification failed:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        setDeploymentStatus({
          ready: false,
          issues: ['Failed to complete deployment verification'],
        });
      } finally {
        setLoading(false);
      }
    };

    verifyDeployment();
  }, []);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verifying Deployment...</h2>
            <Progress value={33} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deploymentStatus) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!deploymentStatus.ready ? (
        <Alert variant="destructive">
          <AlertTitle>Deployment Issues Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2">
              {deploymentStatus.issues.map((issue, index) => (
                <li key={index} className="text-sm">
                  {issue}
                </li>
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
}

export default DeploymentVerification;
