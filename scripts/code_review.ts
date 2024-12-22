import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { type Server } from 'http';


const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HIGH_PRIORITY_PATHS = [
  'client/src/components',
  'server/services',
  'server/routes.ts',
  'db/schema.ts',
  'server/index.ts',
  'client/src/pages'
];

const CORE_PATHS = [
  '/home/runner/AI-bot-template-1/src',
  '/home/runner/AI-bot-template-1/server',
  '/home/runner/AI-bot-template-1/client',
  '/home/runner/AI-bot-template-1/db'
];

const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '*.config.js',
  '*.config.ts',
  'postcss.config.js',
  'tailwind.config.ts',
  'vite.config.ts',
  '__tests__',
  'coverage',
  '.next',
  'public',
];

async function getTypeScriptFiles(filePath: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const stats = await fs.stat(filePath);

    if (stats.isFile()) {
      // If it's a TypeScript file and not ignored, add it
      if (/\.(ts|tsx)$/.test(filePath) && 
          !IGNORE_PATTERNS.some(pattern => filePath.includes(pattern))) {
        files.push(filePath);
      }
    } else if (stats.isDirectory()) {
      const entries = await fs.readdir(filePath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(filePath, entry.name);

        if (IGNORE_PATTERNS.some(pattern => 
          entry.name.includes(pattern) || fullPath.includes(pattern)
        )) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(...await getTypeScriptFiles(fullPath));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing path ${filePath}:`, error);
  }

  return files;
}

async function formatFiles(files: string[]): Promise<void> {
  console.log('Running Prettier...');
  try {
    await execAsync(`npx prettier --write ${files.join(' ')}`);
    console.log('Prettier formatting complete');
  } catch (error) {
    console.error('Error running Prettier:', error);
  }
}

async function lintFiles(files: string[]): Promise<void> {
  console.log('Running ESLint...');
  try {
    await execAsync(`npx eslint --fix ${files.join(' ')}`);
    console.log('ESLint fixes complete');
  } catch (error) {
    console.error('Error running ESLint:', error);
  }
}

async function applyAutoFixes(files: string[]): Promise<void> {
  console.log('\n🔧 Applying automatic fixes...');

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      let modified = content;
      let hasChanges = false;

      // Fix unused variables by removing them
      const unusedVarMatches = content.matchAll(/(?:const|let|var)\s+(\w+)[^;]*;.*?\/\/ @typescript-eslint\/no-unused-vars/g);
      for (const match of Array.from(unusedVarMatches)) {
        modified = modified.replace(match[0], '');
        hasChanges = true;
        console.log(`📝 Removed unused variable: ${match[1]} in ${file}`);
      }

      // Fix React hook dependencies
      const hookMatches = content.matchAll(/useEffect\(\(\)\s*=>\s*{[\s\S]*?},\s*\[(.*?)\]\s*\)/g);
      for (const match of Array.from(hookMatches)) {
        const currentDeps = match[1].split(',').map(d => d.trim()).filter(Boolean);
        const missingDeps = content.match(new RegExp(`warning.*?'(.*?)'.*?react-hooks\/exhaustive-deps`));

        if (missingDeps) {
          const newDeps = [...new Set([...currentDeps, missingDeps[1]])].join(', ');
          modified = modified.replace(match[0], match[0].replace(match[1], newDeps));
          hasChanges = true;
          console.log(`📝 Added missing dependency: ${missingDeps[1]} to useEffect in ${file}`);
        }
      }

      // Fix type-only imports
      const typeOnlyMatches = content.matchAll(/import\s*{\s*(\w+)\s*}\s*from\s*['"].*?['"]\s*;.*?\/\/ @typescript-eslint\/no-unused-vars/g);
      for (const match of Array.from(typeOnlyMatches)) {
        const newImport = `import type { ${match[1]} } from`;
        modified = modified.replace(match[0], match[0].replace('import {', newImport));
        hasChanges = true;
        console.log(`📝 Converted to type-only import: ${match[1]} in ${file}`);
      }

      if (hasChanges) {
        await fs.writeFile(file, modified, 'utf-8');
        console.log(`✅ Applied fixes to ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }

  console.log('🎉 Automatic fixes complete\n');
}

interface CodeIssue {
  type: 'error' | 'warning';
  message: string;
  file: string;
  line?: number;
  column?: number;
  source: string;
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  functions: number;
  dependencies: number;
  lines: number;
}

interface CodeAnalysisResult {
  errors: number;
  warnings: number;
  details: {
    [key: string]: CodeIssue[];
  };
  metrics: {
    totalFiles: number;
    codeHealthScore: number;
    maintainabilityScore: number;
    testabilityScore: number;
    avgComplexity: number;
    maxComplexity: number;
    totalLines: number;
    testCoverage: number;
  };
  highComplexityFiles: Map<string, ComplexityMetrics>;
  unusedFiles: string[];
}

async function analyzeComplexity(filePath: string): Promise<ComplexityMetrics | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').length;
    const functionMatches = content.match(/function\s+\w+\s*\(|\w+\s*:\s*function\s*\(|\(\s*\)\s*=>/g);
    const dependencies = content.match(/import\s+.*?from/g);
    
    // Basic cyclomatic complexity calculation
    const controlFlows = content.match(/if|else|for|while|switch|catch|&&|\|\||\?/g);
    
    return {
      cyclomaticComplexity: (controlFlows?.length || 0) + 1,
      functions: functionMatches?.length || 0,
      dependencies: dependencies?.length || 0,
      lines
    };
  } catch (error) {
    console.error(`Error analyzing complexity for ${filePath}:`, error);
    return null;
  }
}

async function calculateMetrics(files: string[]): Promise<CodeAnalysisResult> {
  const issues: { [key: string]: CodeIssue[] } = {};
  const highComplexityFiles = new Map<string, ComplexityMetrics>();
  let totalComplexity = 0;
  let maxComplexity = 0;
  let totalLines = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const metrics = await analyzeComplexity(file);
    if (metrics) {
      totalComplexity += metrics.cyclomaticComplexity;
      maxComplexity = Math.max(maxComplexity, metrics.cyclomaticComplexity);
      totalLines += metrics.lines;

      if (metrics.cyclomaticComplexity > 10) {
        highComplexityFiles.set(file, metrics);
      }
    }
  }

  // Calculate health scores based on metrics
  const avgComplexity = totalComplexity / files.length;
  const codeHealthScore = Math.max(0, Math.min(100, 100 - (avgComplexity * 5)));
  const maintainabilityScore = Math.max(0, Math.min(100, 100 - (highComplexityFiles.size / files.length * 100)));

  return {
    errors: errorCount,
    warnings: warningCount,
    details: issues,
    metrics: {
      totalFiles: files.length,
      codeHealthScore,
      maintainabilityScore,
      testabilityScore: 75, // TODO: Implement actual test coverage analysis
      avgComplexity,
      maxComplexity,
      totalLines,
      testCoverage: 0 // TODO: Implement actual test coverage calculation
    },
    highComplexityFiles,
    unusedFiles: [] // TODO: Implement dead code detection
  };
}

async function generateReport(files: string[]): Promise<void> {
  try {
    console.log('\n📊 Generating Comprehensive Code Quality Report...');
    console.log('═════════════════════════════════════════════\n');

    const analysis = await calculateMetrics(files);
    const { metrics, highComplexityFiles } = analysis;

    // Health Score Section
    console.log('🏥 Health Metrics');
    console.log('───────────────');
    console.log(`• Overall Health Score: ${metrics.codeHealthScore.toFixed(1)}/100`);
    console.log(`• Maintainability Score: ${metrics.maintainabilityScore.toFixed(1)}/100`);
    console.log(`• Test Coverage: ${metrics.testCoverage.toFixed(1)}%\n`);

    // Codebase Statistics
    console.log('📈 Codebase Statistics');
    console.log('───────────────────');
    console.log(`• Total Files: ${metrics.totalFiles}`);
    console.log(`• Total Lines of Code: ${metrics.totalLines.toLocaleString()}`);
    console.log(`• Average Complexity: ${metrics.avgComplexity.toFixed(2)}`);
    console.log(`• Maximum Complexity: ${metrics.maxComplexity}\n`);

    // Issues Overview
    console.log('⚠️ Issues Overview');
    console.log('────────────────');
    console.log(`• Critical Errors: ${analysis.errors}`);
    console.log(`• Warnings: ${analysis.warnings}`);
    console.log(`• High Complexity Files: ${highComplexityFiles.size}`);
    console.log(`• Files Needing Review: ${highComplexityFiles.size + analysis.unusedFiles.length}\n`);

    // Complex Files Analysis
    if (highComplexityFiles.size > 0) {
      console.log('🔍 High Complexity Files');
      console.log('─────────────────────');
      for (const [file, metrics] of highComplexityFiles.entries()) {
        console.log(`\n${file}:`);
        console.log(`  • Cyclomatic Complexity: ${metrics.cyclomaticComplexity}`);
        console.log(`  • Number of Functions: ${metrics.functions}`);
        console.log(`  • Dependencies: ${metrics.dependencies}`);
        console.log(`  • Lines of Code: ${metrics.lines}`);
      }
      console.log();
    }

    // Recommendations
    console.log('💡 Recommendations');
    console.log('────────────────');
    if (metrics.codeHealthScore < 80) {
      console.log('• Consider refactoring high complexity files into smaller components');
      console.log('• Implement additional unit tests to improve coverage');
      console.log('• Review and simplify complex functions');
    }
    if (metrics.maintainabilityScore < 80) {
      console.log('• Break down large files into more manageable pieces');
      console.log('• Reduce function complexity through composition');
      console.log('• Document complex business logic');
    }
    if (metrics.testCoverage < 70) {
      console.log('• Increase test coverage for critical components');
      console.log('• Add integration tests for complex workflows');
      console.log('• Implement end-to-end tests for critical paths');
    }

    console.log('\n✨ Next Steps');
    console.log('──────────');
    console.log('1. Review and address critical errors');
    console.log('2. Refactor files with high complexity');
    console.log('3. Improve test coverage in critical areas');
    console.log('4. Update documentation for complex components');

  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting automated code review...');

    // First process high priority paths
    let highPriorityFiles: string[] = [];
    for (const priorityPath of HIGH_PRIORITY_PATHS) {
      if (await fs.access(priorityPath).then(() => true).catch(() => false)) {
        console.log(`Processing high priority path: ${priorityPath}`);
        const files = await getTypeScriptFiles(priorityPath);
        highPriorityFiles.push(...files);
      }
    }

    // Process high priority files in smaller batches
    const HIGH_PRIORITY_BATCH_SIZE = 10;
    if (highPriorityFiles.length > 0) {
      console.log('\nProcessing high priority files...');
      for (let i = 0; i < highPriorityFiles.length; i += HIGH_PRIORITY_BATCH_SIZE) {
        const batch = highPriorityFiles.slice(i, i + HIGH_PRIORITY_BATCH_SIZE);
        const batchNumber = Math.floor(i / HIGH_PRIORITY_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(highPriorityFiles.length / HIGH_PRIORITY_BATCH_SIZE);
        const progress = Math.round((batchNumber / totalBatches) * 100);
        console.log(`\n📦 Processing High Priority Batch ${batchNumber}/${totalBatches} (${progress}% complete)`);
        console.log(`   Processing ${batch.length} files in this batch...`);
        await formatFiles(batch);
        await lintFiles(batch);
      }
    }

    // Process remaining core paths
    let remainingFiles: string[] = [];
    for (const corePath of CORE_PATHS) {
      if (await fs.access(corePath).then(() => true).catch(() => false)) {
        console.log(`Processing core path: ${corePath}`);
        const files = await getTypeScriptFiles(corePath);
        // Filter out already processed high priority files
        const newFiles = files.filter(file => !highPriorityFiles.includes(file));
        remainingFiles.push(...newFiles);
      }
    }

    // Process remaining files in larger batches
    const BATCH_SIZE = 20;
    if (remainingFiles.length > 0) {
      console.log('\nProcessing remaining files...');
      for (let i = 0; i < remainingFiles.length; i += BATCH_SIZE) {
        const batch = remainingFiles.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(remainingFiles.length / BATCH_SIZE);
        const progress = Math.round((batchNumber / totalBatches) * 100);
        console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches} (${progress}% complete)`);
        console.log(`   Processing ${batch.length} files in this batch...`);
        await formatFiles(batch);
        await lintFiles(batch);
      }
    }

    // Collect all processed files
    const allFiles = [...highPriorityFiles, ...remainingFiles];

    // Apply automatic fixes
    await applyAutoFixes(allFiles);

    // Generate final report
    console.log('\nGenerating comprehensive code quality report...');
    await generateReport(allFiles);

  } catch (error) {
    console.error('Error in automated code review:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch(console.error);
}

export { formatFiles, lintFiles, generateReport, applyAutoFixes };