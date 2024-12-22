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
};

const SECURITY_PATTERNS = {
  xss: /innerHTML|dangerouslySetInnerHTML|eval|document\.write/i,
  sqlInjection: /raw\s*sql|execute\s*sql/i,
  unsafeAssignment: /Object\.assign|\.\.\.props/i,
};

export class CodeReviewService {
  private readonly rootDir: string;
  private metrics: CodeMetrics;

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

    if (files.length === 0) {
      console.warn('[Code Review Service] No TypeScript files found to analyze');
      return {
        issues: [],
        metrics: this.metrics,
        suggestions: ['No TypeScript files found to analyze'],
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`[Code Review Service] Found ${files.length} TypeScript files to analyze`);

    let totalAccessibilityScore = 0;
    let totalSecurityScore = 0;
    let filesProcessed = 0;
    const startTime = Date.now();

    for (const file of files) {
      try {
        console.log(
          `[Code Review Service] Analyzing file (${++filesProcessed}/${files.length}): ${file}`,
        );

        const content = readFileSync(file, 'utf-8');
        const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

        // Analyze accessibility patterns
        const accessibilityScore = this.analyzeAccessibility(content);
        totalAccessibilityScore += accessibilityScore;

        // Check security patterns
        const securityScore = this.analyzeSecurityPatterns(content);
        totalSecurityScore += securityScore;

        // Analyze AST for code quality
        this.analyzeNode(sourceFile, issues, file);

        // Check for medical domain compliance
        this.checkMedicalCompliance(content, file, issues);

        // Generate improvement suggestions
        this.generateSuggestions(content, file, suggestions);

        const progress = Math.round((filesProcessed / files.length) * 100);
        if (progress % 10 === 0) {
          console.log(`[Code Review Service] Progress: ${progress}% complete`);
        }
      } catch (error) {
        console.error(`[Code Review Service] Error analyzing file ${file}:`, error);
        issues.push({
          type: 'error',
          message: `Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          file,
          line: 0,
          column: 0,
          autoFixable: false,
        });
      }
    }

    // Calculate final metrics
    this.metrics = {
      accessibility: totalAccessibilityScore / files.length,
      security: totalSecurityScore / files.length,
      maintainability: this.calculateMaintainabilityIndex(files),
      testCoverage: await this.calculateTestCoverage(),
      medicalComplianceScore: this.calculateMedicalCompliance(files),
      lastUpdated: new Date().toISOString(),
    };

    return {
      issues,
      metrics: this.metrics,
      suggestions,
      timestamp: new Date().toISOString(),
    };
  }

  private getAllTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...this.getAllTypeScriptFiles(fullPath));
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private analyzeAccessibility(content: string): number {
    const patterns = {
      ariaLabels: (content.match(/aria-label/g) || []).length,
      roleAttributes: (content.match(/role=/g) || []).length,
      altTexts: (content.match(/alt=/g) || []).length,
      tabIndex: (content.match(/tabIndex/g) || []).length,
      semanticElements: (content.match(/<(header|main|footer|nav|article|aside|section)/g) || [])
        .length,
    };

    return (
      (patterns.ariaLabels * 2 +
        patterns.roleAttributes * 1.5 +
        patterns.altTexts * 2 +
        patterns.tabIndex +
        patterns.semanticElements * 1.5) /
      (content.length / 1000)
    );
  }

  private analyzeSecurityPatterns(content: string): number {
    const patterns = {
      inputValidation: (content.match(/validate|sanitize|escape/g) || []).length,
      errorHandling: (content.match(/try|catch|throw|error/g) || []).length,
      sensitiveData: (content.match(/encrypt|hash|secure|protected/g) || []).length,
      xssProtection: (content.match(/DOMPurify|escapeHtml|sanitizeHtml/g) || []).length,
    };

    return (
      (patterns.inputValidation * 2 +
        patterns.errorHandling * 1.5 +
        patterns.sensitiveData * 3 +
        patterns.xssProtection * 2) /
      (content.length / 1000)
    );
  }

  private checkMedicalCompliance(content: string, file: string, issues: CodeIssue[]): void {
    // Check for unprotected sensitive data
    const sensitiveDataMatches = content.match(MEDICAL_PATTERNS.sensitiveData);
    if (sensitiveDataMatches) {
      const hipaaMatches = content.match(MEDICAL_PATTERNS.hipaaCompliance);
      if (!hipaaMatches) {
        issues.push({
          type: 'warning',
          message:
            'Potential unprotected medical data detected. Consider adding encryption/sanitization.',
          file,
          line: this.findLineNumber(content, sensitiveDataMatches[0]),
          column: 0,
          autoFixable: false,
        });
      }
    }

    // Check for accessibility in medical interfaces
    if (content.includes('patient') || content.includes('medical')) {
      const accessibilityMatches = content.match(MEDICAL_PATTERNS.accessibility);
      if (!accessibilityMatches) {
        issues.push({
          type: 'warning',
          message: 'Medical interface missing accessibility attributes',
          file,
          line: 1,
          column: 0,
          autoFixable: true,
        });
      }
    }
  }

  private analyzeNode(node: ts.Node, issues: CodeIssue[], file: string): void {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      this.analyzeFunctionComplexity(node, issues, file);
    }

    if (ts.isIdentifier(node)) {
      this.analyzeNaming(node, issues, file);
    }

    ts.forEachChild(node, (child) => this.analyzeNode(child, issues, file));
  }

  private analyzeFunctionComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration,
    issues: CodeIssue[],
    file: string,
  ): void {
    const functionName = node.name?.getText() || 'anonymous';
    const lineAndChar = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
    const functionText = node.getText();

    // Check function length
    const lines = functionText.split('\n').length;
    if (lines > 30) {
      issues.push({
        type: 'warning',
        message: `Function "${functionName}" is too long (${lines} lines)`,
        file,
        line: lineAndChar.line + 1,
        column: lineAndChar.character,
        autoFixable: false,
      });
    }

    // Check cyclomatic complexity
    const complexity = this.calculateCyclomaticComplexity(functionText);
    if (complexity > 10) {
      issues.push({
        type: 'warning',
        message: `Function "${functionName}" has high cyclomatic complexity (${complexity})`,
        file,
        line: lineAndChar.line + 1,
        column: lineAndChar.character,
        autoFixable: false,
      });
    }
  }

  private generateSuggestions(content: string, file: string, suggestions: string[]): void {
    // Suggest error boundary for medical data handling
    if (content.includes('patient') || content.includes('medical')) {
      suggestions.push(
        `Consider adding an ErrorBoundary component in ${file} to handle medical data display errors gracefully`,
      );
    }

    // Suggest accessibility improvements
    if (!content.includes('aria-')) {
      suggestions.push(`Add ARIA labels in ${file} to improve accessibility`);
    }

    // Suggest security improvements
    if (content.includes('innerHTML')) {
      suggestions.push(
        `Replace innerHTML in ${file} with safer alternatives to prevent XSS attacks`,
      );
    }
  }

  private calculateCyclomaticComplexity(content: string): number {
    const controlFlowMatches = content.match(/if|else|while|for|switch|case|&&|\|\||catch/g);
    return (controlFlowMatches?.length || 0) + 1;
  }

  private calculateMaintainabilityIndex(files: string[]): number {
    let totalMaintainability = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const loc = content.split('\n').length;
      const cc = this.calculateCyclomaticComplexity(content);
      const halsteadVolume = this.calculateHalsteadVolume(content);

      // Maintainability Index formula
      const mi = Math.max(
        0,
        Math.min(100, 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cc - 16.2 * Math.log(loc)),
      );
      totalMaintainability += mi;
    }

    return totalMaintainability / files.length;
  }

  private calculateHalsteadVolume(content: string): number {
    const operators = content.match(/[+\-*/%=<>!&|^~?:]+/g) || [];
    const operands = content.match(/[a-zA-Z_]\w*|[0-9]+/g) || [];
    const uniqueOperators = new Set(operators);
    const uniqueOperands = new Set(operands);

    const N = operators.length + operands.length;
    const n = uniqueOperators.size + uniqueOperands.size;

    return N * Math.log2(n || 1);
  }

  private async calculateTestCoverage(): Promise<number> {
    // Mock coverage calculation - replace with actual test coverage data
    return 75;
  }

  private findLineNumber(content: string, searchString: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i + 1;
      }
    }
    return 1;
  }

  private analyzeNaming(node: ts.Identifier, issues: CodeIssue[], file: string): void {
    // Add your naming convention checks here.  For example:
    if (node.text.startsWith('_')) {
      issues.push({
        type: 'warning',
        message: `Identifier "${node.text}" starts with an underscore, which might indicate a private member not following naming conventions.`,
        file,
        line: node.getStartLineNumber(),
        column: node.getStartColumn(),
        autoFixable: false,
      });
    }

    // Add more naming checks as needed.
  }

  private calculateMedicalCompliance(files: string[]): number {
    let totalCompliance = 0;
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const sensitiveDataMatches = content.match(MEDICAL_PATTERNS.sensitiveData);
      const hipaaMatches = content.match(MEDICAL_PATTERNS.hipaaCompliance);
      const accessibilityMatches = content.match(MEDICAL_PATTERNS.accessibility);
      let score = 0;
      if (sensitiveDataMatches && hipaaMatches) score += 1;
      if (accessibilityMatches) score += 1;
      totalCompliance += score;
    }
    return totalCompliance / files.length;
  }
}
