import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { CodeReviewStatus } from './CodeReviewStatus';
import { IntegrationMonitor } from './IntegrationMonitor';

type ProcessStep = 'review' | 'integration' | 'complete';

interface Props {
  onComplete?: () => void;
}

export const ProcessManager: React.FC<Props> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<ProcessStep>('review');
  const [error, setError] = useState<string | null>(null);

  const handleStepComplete = (step: ProcessStep) => {
    try {
      switch (step) {
        case 'review':
          setCurrentStep('integration');
          break;
        case 'integration':
          setCurrentStep('complete');
          if (onComplete) {
            onComplete();
          }
          break;
        default:
          break;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleRollback = () => {
    setCurrentStep('review');
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {error && (
        <Card className="bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleRollback} className="mt-2" variant="destructive">
              Rollback to Code Review
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 'review' && 'Code Review In Progress'}
            {currentStep === 'integration' && 'Integration Check In Progress'}
            {currentStep === 'complete' && 'Process Complete'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 'review' && (
            <CodeReviewStatus onComplete={() => handleStepComplete('review')} />
          )}

          {currentStep === 'integration' && (
            <IntegrationMonitor onComplete={() => handleStepComplete('integration')} />
          )}

          {currentStep === 'complete' && (
            <div className="text-center">
              <p className="text-green-600">All processes completed successfully!</p>
              <Button onClick={handleRollback} className="mt-4" variant="outline">
                Start New Review
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessManager;
