import { parse as parseTS } from '@typescript-eslint/parser';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

interface CodeReviewResult {
  issues: CodeIssue[];
  metrics: CodeMetrics;
  timestamp: string;
}

interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line: number;
  column: number;
  source?: string;
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

export class CodeReviewService {
  private static instance: CodeReviewService | null = null;
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async reviewCode(): Promise<CodeReviewResult> {
    const issues: CodeIssue[] = [];
    const metrics: CodeMetrics = {
      accessibility: 0,
      security: 0,
      maintainability: 0,
      testCoverage: 0,
      medicalComplianceScore: 0,
    };

    const files = this.getAllTypeScriptFiles(this.rootDir);
    let totalAccessibilityScore = 0;
    let totalSecurityScore = 0;

    for (const file of files) {
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
    }

    // Calculate final metrics
    metrics.accessibility = totalAccessibilityScore / files.length;
    metrics.security = totalSecurityScore / files.length;
    metrics.maintainability = this.calculateMaintainabilityIndex(files);
    metrics.testCoverage = await this.calculateTestCoverage();
    metrics.medicalComplianceScore = this.calculateMedicalCompliance(files);

    return { issues, metrics };
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
    };

    // Weight different accessibility features
    return (
      (patterns.ariaLabels * 2 +
        patterns.roleAttributes * 1.5 +
        patterns.altTexts * 2 +
        patterns.tabIndex) /
      (content.length / 1000)
    );
  }

  private analyzeSecurityPatterns(content: string): number {
    const patterns = {
      inputValidation: (content.match(/validate|sanitize|escape/g) || []).length,
      errorHandling: (content.match(/try|catch|throw|error/g) || []).length,
      sensitiveData: (content.match(/encrypt|hash|secure|protected/g) || []).length,
    };

    return (
      (patterns.inputValidation * 2 + patterns.errorHandling * 1.5 + patterns.sensitiveData * 3) /
      (content.length / 1000)
    );
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

    // Check function length
    const functionText = node.getText();
    const lines = functionText.split('\n').length;
    if (lines > 30) {
      issues.push({
        type: 'warning',
        message: `Function "${functionName}" is too long (${lines} lines)`,
        file,
        line: lineAndChar.line + 1,
        column: lineAndChar.character,
      });
    }
  }

  private analyzeNaming(node: ts.Identifier, issues: CodeIssue[], file: string): void {
    const name = node.getText();
    const lineAndChar = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());

    // Check naming conventions
    if (/^[A-Z]/.test(name) && name.length < 2) {
      issues.push({
        type: 'warning',
        message: `Single-letter capitalized identifier "${name}" should be more descriptive`,
        file,
        line: lineAndChar.line + 1,
        column: lineAndChar.character,
      });
    }
  }

  private calculateMaintainabilityIndex(files: string[]): number {
    let totalMaintainability = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const loc = content.split('\n').length;
      const cc = this.calculateCyclomaticComplexity(content);
      const halsteadVolume = this.calculateHalsteadVolume(content);

      // Maintainability Index formula
      const mi = 171 - 5.2 * Math.log(halsteadVolume) - 0.23 * cc - 16.2 * Math.log(loc);
      totalMaintainability += Math.max(0, Math.min(100, mi));
    }

    return totalMaintainability / files.length;
  }

  private calculateCyclomaticComplexity(content: string): number {
    const controlFlowMatches = content.match(/if|else|while|for|switch|case|&&|\|\||catch/g);
    return (controlFlowMatches?.length || 0) + 1;
  }

  private calculateHalsteadVolume(content: string): number {
    const operators = content.match(/[+\-*/%=<>!&|^~?:]+/g) || [];
    const operands = content.match(/[a-zA-Z_]\w*|[0-9]+/g) || [];
    const uniqueOperators = new Set(operators);
    const uniqueOperands = new Set(operands);

    const N = operators.length + operands.length;
    const n = uniqueOperators.size + uniqueOperands.size;

    return N * Math.log2(n);
  }

  private async calculateTestCoverage(): Promise<number> {
    // Mock coverage calculation - replace with actual test coverage data
    return 75;
  }

  private calculateMedicalCompliance(files: string[]): number {
    let totalCompliance = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const sensitiveDataMatches = content.match(MEDICAL_PATTERNS.sensitiveData) || [];
      const hipaaMatches = content.match(MEDICAL_PATTERNS.hipaaCompliance) || [];
      const accessibilityMatches = content.match(MEDICAL_PATTERNS.accessibility) || [];

      const fileCompliance =
        (sensitiveDataMatches.length * 2 + hipaaMatches.length * 3 + accessibilityMatches.length) /
        (content.length / 1000);

      totalCompliance += fileCompliance;
    }

    return (totalCompliance / files.length) * 100;
  }
}
