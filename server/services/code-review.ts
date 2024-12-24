import { parse as parseTS } from '@typescript-eslint/parser';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

interface CodeReviewResult {
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: string[];
  timestamp: string;
}

interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  source?: string;
  autoFixable: boolean;
}

interface CodeMetrics {
  accessibility: number;
  security: number;
  maintainability: number;
  testCoverage: number;
  medicalComplianceScore: number;
  lastUpdated: string;
}

const MEDICAL_PATTERNS = {
  sensitiveData: /patient|medical|health|diagnosis|treatment/i,
  hipaaCompliance: /encrypt|hash|sanitize|validate/i,
  accessibility: /aria-|role=|alt=|tabIndex/i,
} as const;

const SECURITY_PATTERNS = {
  xss: /innerHTML|dangerouslySetInnerHTML|eval|document\.write/i,
  sqlInjection: /raw\s*sql|execute\s*sql/i,
  unsafeAssignment: /Object\.assign|\.\.\.props/i,
} as const;

export class CodeReviewService {
  protected rootDir: string;
  protected metrics: CodeMetrics;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    this.metrics = {
      accessibility: 0,
      security: 0,
      maintainability: 0,
      testCoverage: 0,
      medicalComplianceScore: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  async reviewCode(): Promise<CodeReviewResult> {
    console.log('[Code Review Service] Starting code review process...');

    const issues: CodeIssue[] = [];
    const suggestions: string[] = [];
    const files = this.getAllTypeScriptFiles(this.rootDir);

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        // Check for security issues
        this.checkSecurityIssues(content, file, issues);

        // Check for medical data compliance
        this.checkMedicalCompliance(content, file, issues);

        // Analyze code structure
        this.analyzeNode(sourceFile, issues, file);

        // Generate suggestions
        this.generateSuggestions(content, file, suggestions);
      } catch (error) {
        this.handleError(error, file, issues);
      }
    }

    return {
      issues,
      metrics: this.metrics,
      suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  protected handleError(error: unknown, file: string, issues: CodeIssue[]): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`Error processing ${file}: ${errorMessage}`);

    issues.push({
      type: 'error',
      message: `Error processing file: ${errorMessage}`,
      file,
      line: 0,
      column: 0,
      autoFixable: false,
    });
  }

  protected getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        files.push(...this.getAllTypeScriptFiles(fullPath));
      } else if (this.isTypeScriptFile(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  protected shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['node_modules', 'dist', 'build', '.git'];
    return skipDirs.includes(dirName);
  }

  protected isTypeScriptFile(fileName: string): boolean {
    return /\.(ts|tsx)$/.test(fileName);
  }

  protected checkSecurityIssues(content: string, file: string, issues: CodeIssue[]): void {
    Object.entries(SECURITY_PATTERNS).forEach(([type, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'warning',
          message: `Potential security issue (${type}): Found potentially unsafe pattern`,
          file,
          line: this.getLineNumber(content, matches.index || 0),
          column: this.getColumnNumber(content, matches.index || 0),
          autoFixable: false,
        });
      }
    });
  }

  protected checkMedicalCompliance(content: string, file: string, issues: CodeIssue[]): void {
    Object.entries(MEDICAL_PATTERNS).forEach(([type, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'info',
          message: `Medical compliance check (${type}): Found pattern that may require review`,
          file,
          line: this.getLineNumber(content, matches.index || 0),
          column: this.getColumnNumber(content, matches.index || 0),
          autoFixable: false,
        });
      }
    });
  }

  protected analyzeNode(node: ts.Node, issues: CodeIssue[], file: string): void {
    ts.forEachChild(node, (child) => {
      this.checkNodeForIssues(child, issues, file);
      this.analyzeNode(child, issues, file);
    });
  }

  protected checkNodeForIssues(node: ts.Node, issues: CodeIssue[], file: string): void {
    const { line, character } = ts.getLineAndCharacterOfPosition(
      node.getSourceFile(),
      node.getStart(),
    );

    if (ts.isAnyKeyword(node)) {
      issues.push({
        type: 'warning',
        message: 'Usage of "any" type detected - consider using a more specific type',
        file,
        line: line + 1,
        column: character + 1,
        autoFixable: false,
      });
    }

    if (ts.isFunctionDeclaration(node) && !node.type) {
      issues.push({
        type: 'info',
        message: 'Function is missing return type annotation',
        file,
        line: line + 1,
        column: character + 1,
        autoFixable: true,
      });
    }
  }

  protected generateSuggestions(content: string, file: string, suggestions: string[]): void {
    const lines = content.split('\n');
    const longLines = lines.filter((line) => line.length > 100);

    if (longLines.length > 0) {
      suggestions.push(
        `${file}: Consider breaking down ${longLines.length} lines that exceed 100 characters`,
      );
    }

    if (content.includes('TODO')) {
      suggestions.push(`${file}: Contains TODO comments that should be addressed`);
    }
  }

  protected getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  protected getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }
}
