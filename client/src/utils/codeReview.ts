import * as fs from 'fs/promises';
import * as path from 'path';

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
    fixableCount: number;
  };
}

export class CodeReviewHelper {
  private eslint: any;

  constructor() {
    this.initializeESLint();
  }

  private async initializeESLint() {
    try {
      const { ESLint } = await import('eslint');
      this.eslint = new ESLint({
        fix: true,
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        useEslintrc: true,
      });
    } catch (error) {
      console.error('Failed to initialize ESLint:', error);
    }
  }

  async reviewFile(filePath: string): Promise<CodeIssue[]> {
    if (!this.eslint) {
      return [];
    }

    try {
      const results = await this.eslint.lintFiles([filePath]);

      return results.flatMap((result: any) =>
        result.messages.map((msg: any) => ({
          file: filePath,
          line: msg.line,
          column: msg.column,
          message: msg.message,
          severity: msg.severity === 2 ? 'error' : 'warning',
          rule: msg.ruleId || undefined,
        })),
      );
    } catch (error) {
      console.error(
        `Error reviewing file ${filePath}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      return [];
    }
  }

  async reviewDirectory(dirPath: string): Promise<ReviewResult> {
    const issues: CodeIssue[] = [];
    let filesChecked = 0;
    let errorCount = 0;
    let warningCount = 0;
    let fixableCount = 0;

    try {
      const files = await this.getFiles(dirPath);

      for (const file of files) {
        const fileIssues = await this.reviewFile(file);
        issues.push(...fileIssues);

        filesChecked++;
        errorCount += fileIssues.filter((i) => i.severity === 'error').length;
        warningCount += fileIssues.filter((i) => i.severity === 'warning').length;
        fixableCount += fileIssues.length;
      }
    } catch (error) {
      console.error('Error during directory review:', error);
    }

    return {
      issues,
      stats: {
        filesChecked,
        errorCount,
        warningCount,
        fixableCount,
      },
    };
  }

  private async getFiles(dir: string): Promise<string[]> {
    // Using browser-compatible file listing approach
    return [
      'client/src/**/*.{ts,tsx}',
      'server/**/*.{ts,tsx}',
      'utils/**/*.{ts,tsx}',
    ];
  }

  async fixIssues(issues: CodeIssue[]): Promise<void> {
    if (!this.eslint) {
      return;
    }

    for (const issue of issues) {
      if (issue.rule) {
        try {
          const results = await this.eslint.lintFiles([issue.file]);
          await this.eslint.outputFixes(results);
        } catch (error) {
          console.error(
            'Error fixing issue:',
            error instanceof Error ? error.message : 'Unknown error',
            `in file ${issue.file}`,
          );
        }
      }
    }
  }
}