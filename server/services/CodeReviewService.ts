import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// Schema for code review configuration
const codeReviewConfigSchema = z.object({
  excludePatterns: z.array(z.string()).optional(),
  includeOnly: z.array(z.string()).optional(),
  maxIssues: z.number().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
});

export type CodeReviewConfig = z.infer<typeof codeReviewConfigSchema>;

interface CodeIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  suggestion?: string;
}

export class CodeReviewService {
  private static instance: CodeReviewService;
  private defaultConfig: CodeReviewConfig = {
    excludePatterns: ['node_modules/', '.git/', 'dist/'],
    maxIssues: 100,
    severity: 'error',
  };

  private constructor() {}

  public static getInstance(): CodeReviewService {
    if (!CodeReviewService.instance) {
      CodeReviewService.instance = new CodeReviewService();
    }
    return CodeReviewService.instance;
  }

  async analyzeDirectory(
    directoryPath: string,
    config?: Partial<CodeReviewConfig>,
  ): Promise<CodeIssue[]> {
    try {
      // Validate and merge config with defaults
      const validatedConfig = config
        ? codeReviewConfigSchema.parse({ ...this.defaultConfig, ...config })
        : this.defaultConfig;

      const issues: CodeIssue[] = [];
      const files = await this.getFilesToAnalyze(directoryPath, validatedConfig);

      for (const file of files) {
        const fileContent = await fs.readFile(file, 'utf-8');
        const fileIssues = await this.analyzeFile(file, fileContent);
        issues.push(...fileIssues);
      }

      return this.filterAndSortIssues(issues, validatedConfig);
    } catch (error) {
      console.error('Error analyzing directory:', error);
      throw new Error('Failed to analyze directory');
    }
  }

  private async getFilesToAnalyze(
    directoryPath: string,
    config: CodeReviewConfig,
  ): Promise<string[]> {
    const allFiles = await this.getAllFiles(directoryPath);

    return allFiles.filter((file) => {
      // Apply exclude patterns
      if (
        config.excludePatterns?.some(
          (pattern) => file.includes(pattern) || file.match(new RegExp(pattern)),
        )
      ) {
        return false;
      }

      // Apply include patterns if specified
      if (config.includeOnly?.length) {
        return config.includeOnly.some(
          (pattern) => file.endsWith(pattern) || file.includes(pattern),
        );
      }

      // Default to analyzing common web development files
      return /\.(ts|tsx|js|jsx|css|html)$/.test(file);
    });
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async analyzeFile(filePath: string, content: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    // Basic analysis rules
    lines.forEach((line, index) => {
      // Check for console.log statements
      if (line.includes('console.log')) {
        issues.push({
          file: filePath,
          line: index + 1,
          column: line.indexOf('console.log'),
          severity: 'warning',
          message: 'Avoid using console.log in production code',
          code: 'no-console',
          suggestion: 'Use a proper logging service instead',
        });
      }

      // Check for TODO comments
      if (line.includes('TODO')) {
        issues.push({
          file: filePath,
          line: index + 1,
          column: line.indexOf('TODO'),
          severity: 'info',
          message: 'TODO comment found',
          code: 'no-todo',
          suggestion: 'Consider creating an issue instead of TODO comment',
        });
      }

      // Check for proper error handling
      if (line.includes('catch') && !line.includes('console.error')) {
        issues.push({
          file: filePath,
          line: index + 1,
          column: 0,
          severity: 'warning',
          message: 'Catch block should handle errors properly',
          code: 'proper-error-handling',
          suggestion: 'Add proper error logging and handling',
        });
      }
    });

    return issues;
  }

  private filterAndSortIssues(issues: CodeIssue[], config: CodeReviewConfig): CodeIssue[] {
    let filteredIssues = issues;

    // Filter by severity if specified
    if (config.severity) {
      filteredIssues = filteredIssues.filter((issue) => issue.severity === config.severity);
    }

    // Limit number of issues if specified
    if (config.maxIssues) {
      filteredIssues = filteredIssues.slice(0, config.maxIssues);
    }

    // Sort by severity and file location
    return filteredIssues.sort((a, b) => {
      // Sort by severity (error > warning > info)
      const severityOrder = { error: 0, warning: 1, info: 2 };
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }

      // Then by file name
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }

      // Then by line number
      return a.line - b.line;
    });
  }
}
