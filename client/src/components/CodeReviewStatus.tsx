import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import { CodeReviewHelper } from '@/utils/codeReview';

interface Props {
  onComplete?: () => void;
}

export const CodeReviewStatus: React.FC<Props> = ({ onComplete }) => {
  const [reviewStatus, setReviewStatus] = useState<{
    issues: Array<{
      file: string;
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
      rule?: string;
    }>;
    stats: {
      filesChecked: number;
      errorCount: number;
      warningCount: number;
      fixableCount: number;
    };
  } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const runCodeReview = async () => {
      setReviewing(true);
      const reviewer = new CodeReviewHelper();

      try {
        const result = await reviewer.reviewDirectory('.');
        setReviewStatus(result);

        if (result.issues.length > 0) {
          await reviewer.fixIssues(result.issues);
        }

        if (onComplete) {
          onComplete();
        }
      } catch (error) {
        console.error('Code review failed:', error);
      } finally {
        setReviewing(false);
      }
    };

    void runCodeReview();
  }, [onComplete]);

  if (reviewing) {
    return (
      <div className="space-y-4">
        <Progress value={progress} />
        <p>Reviewing code...</p>
      </div>
    );
  }

  if (!reviewStatus) {
    return <div>Preparing code review...</div>;
  }

  return (
    <div className="space-y-4">
      <Alert variant={reviewStatus.stats.errorCount > 0 ? 'destructive' : 'default'}>
        <AlertTitle>Code Review Results</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4">
            <li>Files checked: {reviewStatus.stats.filesChecked}</li>
            <li>Errors found: {reviewStatus.stats.errorCount}</li>
            <li>Warnings found: {reviewStatus.stats.warningCount}</li>
            <li>Fixable issues: {reviewStatus.stats.fixableCount}</li>
          </ul>
        </AlertDescription>
      </Alert>

      {reviewStatus.issues.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Issues Found:</h3>
          <div className="mt-2 space-y-2">
            {reviewStatus.issues.map((issue, index) => (
              <div key={index} className="p-2 border rounded">
                <p className="font-medium">
                  {issue.file}:{issue.line}:{issue.column}
                </p>
                <p className="text-sm text-gray-600">{issue.message}</p>
                {issue.rule && <p className="text-xs text-gray-500">Rule: {issue.rule}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
