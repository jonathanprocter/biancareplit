interface CodeIssue {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  rule?: string;
}

interface ReviewResult {
  issues: CodeIssue[];
  stats: {
    filesChecked: number;
    errorCount: number;
    warningCount: number;
  };
}

export class CodeReview {
  private currentResult: ReviewResult = {
    issues: [],
    stats: {
      filesChecked: 0,
      errorCount: 0,
      warningCount: 0,
    },
  };

  async reviewFile(filePath: string): Promise<CodeIssue[]> {
    try {
      const response = await fetch('/api/review-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`File review failed: ${response.statusText}`);
      }

      const issues: CodeIssue[] = await response.json();
      this.currentResult.stats.filesChecked++;
      this.currentResult.stats.errorCount += issues.filter((i) => i.severity === 'error').length;
      this.currentResult.stats.warningCount += issues.filter(
        (i) => i.severity === 'warning',
      ).length;

      return issues;
    } catch (error) {
      console.error(
        `Error reviewing file ${filePath}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async getReviewStatus(): Promise<ReviewResult> {
    return this.currentResult;
  }

  async clearReview(): Promise<void> {
    this.currentResult = {
      issues: [],
      stats: {
        filesChecked: 0,
        errorCount: 0,
        warningCount: 0,
      },
    };
  }
}
