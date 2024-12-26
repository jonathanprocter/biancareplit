import { ESLint } from 'eslint';
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
  private eslint: ESLint;

  constructor() {
    this.eslint = new ESLint({
      fix: true,
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      useEslintrc: true,
    });
  }

  async reviewFile(filePath: string): Promise<CodeIssue[]> {
    try {
      const results = await this.eslint.lintFiles([filePath]);

      return results.flatMap((result) =>
        result.messages.map((msg) => ({
          file: path.relative(process.cwd(), result.filePath),
          line: msg.line,
          column: msg.column,
          message: msg.message,
          severity: msg.severity === 2 ? 'error' : 'warning',
          rule: msg.ruleId || undefined,
        })),
      );
    } catch (error) {
      console.error(`Error reviewing file ${filePath}:`, error);
      return [];
    }
  }

  async reviewDirectory(dirPath: string): Promise<ReviewResult> {
    const issues: CodeIssue[] = [];
    let filesChecked = 0;
    let errorCount = 0;
    let warningCount = 0;
    let fixableCount = 0;

    async function* getFiles(dir: string): AsyncGenerator<string> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            yield* getFiles(fullPath);
          }
        } else if (
          entry.isFile() &&
          /\.(js|jsx|ts|tsx)$/.test(entry.name) &&
          !entry.name.endsWith('.d.ts')
        ) {
          yield fullPath;
        }
      }
    }

    for await (const file of getFiles(dirPath)) {
      const fileIssues = await this.reviewFile(file);
      issues.push(...fileIssues);

      filesChecked++;
      errorCount += fileIssues.filter((i) => i.severity === 'error').length;
      warningCount += fileIssues.filter((i) => i.severity === 'warning').length;
      fixableCount += fileIssues.length;
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

  async fixIssues(issues: CodeIssue[]): Promise<void> {
    const eslintFix = new ESLint({ fix: true });

    for (const issue of issues) {
      if (issue.rule) {
        try {
          const results = await eslintFix.lintFiles([issue.file]);
          await ESLint.outputFixes(results);
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
