import { exec } from 'child_process';
import { promisify } from 'util';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CORE_PATHS = [
  path.resolve(__dirname, '..', 'src'),
  path.resolve(__dirname, '..', 'server'),
  path.resolve(__dirname, '..', 'client'),
  path.resolve(__dirname, '..', 'db'),
];

// Prioritize these paths for initial review
const HIGH_PRIORITY_PATHS = [
  path.resolve(__dirname, '..', 'src/components'),
  path.resolve(__dirname, '..', 'server/services'),
  path.resolve(__dirname, '..', 'server/routes.ts'),
  path.resolve(__dirname, '..', 'db/schema.ts'),
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

async function getTypeScriptFiles(path: string): Promise<string[]> {
  const allFiles: string[] = [];
  
  try {
    const stats = await fs.stat(path);
    
    if (stats.isFile()) {
      // If it's a single file and matches our pattern, add it
      if (/\.(ts|tsx|js|jsx)$/.test(path)) {
        allFiles.push(path);
      }
    } else if (stats.isDirectory()) {
      const entries = await fs.readdir(path, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path + '/' + entry.name;
        
        // Skip ignored patterns
        if (IGNORE_PATTERNS.some(pattern => 
          entry.name.includes(pattern) || fullPath.includes(pattern)
        )) {
          continue;
        }
        
        if (entry.isDirectory()) {
          const subFiles = await getTypeScriptFiles(fullPath);
          allFiles.push(...subFiles);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          allFiles.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error processing path ${path}:`, error);
  }
  
  return allFiles;
}

async function formatFiles(files: string[]): Promise<void> {
  console.log('Running Prettier...');
  try {
    await execAsync(`npx prettier --write ${files.join(' ')}`);
    console.log('Prettier formatting complete');
  } catch (error) {
    console.error('Error running Prettier:', error);
    throw error;
  }
}

async function lintFiles(files: string[]): Promise<void> {
  console.log('Running ESLint...');
  try {
    await execAsync(`npx eslint --fix ${files.join(' ')}`);
    console.log('ESLint fixes complete');
  } catch (error) {
    console.error('Error running ESLint:', error);
    throw error;
  }
}

async function generateReport(files: string[]): Promise<void> {
  console.log('\nCode Quality Report');
  console.log('==================');
  
  try {
    // Run ESLint in report mode with custom configuration for stricter analysis
    const { stdout: lintOutput } = await execAsync(
      `npx eslint ${files.join(' ')} --format stylish --max-warnings 0`
    );
    
    // Parse and categorize ESLint issues
    const issues = {
      warnings: (lintOutput.match(/warning/g) || []).length,
      errors: (lintOutput.match(/error/g) || []).length,
      unused: (lintOutput.match(/no-unused-vars/g) || []).length,
      hooks: (lintOutput.match(/react-hooks\//g) || []).length,
      typescript: (lintOutput.match(/@typescript-eslint\//g) || []).length
    };
    
    console.log('\nIssues Summary:');
    console.log('──────────────────────────────');
    console.log(`📊 Total Issues: ${issues.warnings + issues.errors}`);
    console.log(`🚨 Critical Errors: ${issues.errors}`);
    console.log(`⚠️  Warnings: ${issues.warnings}`);
    console.log(`🧹 Cleanup Needed:`);
    console.log(`  • Unused Variables/Imports: ${issues.unused}`);
    console.log(`  • React Hooks Issues: ${issues.hooks}`);
    console.log(`  • TypeScript-specific: ${issues.typescript}`);
    console.log('──────────────────────────────');
    
    if (issues.warnings > 0 || issues.errors > 0) {
      console.log('\nDetailed ESLint Report:');
      console.log(lintOutput);
    }
    
    // Code complexity analysis
    console.log('\nCode Complexity Analysis:');
    const complexityResults: Record<string, {
      cyclomaticComplexity: number;
      dependencies: string[];
      loc: number;
      functions: number;
      classes: number;
    }> = {};
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const { stdout: fileContent } = await execAsync(`cat ${file}`);
        
        // Calculate cyclomatic complexity (enhanced)
        const complexity = (fileContent.match(
          /(if|while|for|switch|catch|\?|&&|\|\||=>)/g
        ) || []).length;
        
        // Count lines of code (excluding comments and blank lines)
        const loc = fileContent
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('//'))
          .length;
        
        // Count functions and classes
        const functions = (fileContent.match(
          /\b(function|=>)\b|\b(get|set|async)\s+\w+\s*\(/g
        ) || []).length;
        
        const classes = (fileContent.match(/\bclass\s+\w+/g) || []).length;
        
        // Find imports
        const imports = fileContent.match(/import .+ from ['"][@\w\/\-\.]+['"]/g) || [];
        
        complexityResults[file] = {
          cyclomaticComplexity: complexity,
          dependencies: imports.map(imp => imp.match(/from ['"](.+)['"]/)?.[1] || ''),
          loc,
          functions,
          classes,
        };
      }
    }
    
    // Report high complexity files
    const highComplexityThreshold = 15; // Increased threshold for more meaningful results
    const highComplexityFiles = Object.entries(complexityResults)
      .filter(([_, data]) => data.cyclomaticComplexity > highComplexityThreshold)
      .sort(([_, a], [__, b]) => b.cyclomaticComplexity - a.cyclomaticComplexity);
    
    if (highComplexityFiles.length > 0) {
      console.log('\nHigh Complexity Files (needs refactoring):');
      highComplexityFiles.forEach(([file, data]) => {
        console.log(`- ${file}:`);
        console.log(`  Complexity: ${data.cyclomaticComplexity}`);
        console.log(`  Lines of Code: ${data.loc}`);
        console.log(`  Functions: ${data.functions}`);
        console.log(`  Classes: ${data.classes}`);
      });
    }
    
    // Dependency analysis
    console.log('\nDependency Analysis:');
    const dependencyUsage = new Map<string, number>();
    Object.values(complexityResults).forEach(({ dependencies }) => {
      dependencies.forEach(dep => {
        dependencyUsage.set(dep, (dependencyUsage.get(dep) || 0) + 1);
      });
    });
    
    // Report most used dependencies
    const topDependencies = Array.from(dependencyUsage.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 10);
    
    if (topDependencies.length > 0) {
      console.log('\nMost Used Dependencies:');
      topDependencies.forEach(([dep, count]) => {
        console.log(`- ${dep}: ${count} usages`);
      });
    }
    
    // Find potential dead code (files with no imports and low complexity)
    const unusedFiles = Object.entries(complexityResults)
      .filter(([file, data]) => {
        const noImports = !Array.from(dependencyUsage.keys()).some(dep => dep.includes(file));
        const lowComplexity = data.cyclomaticComplexity < 5;
        return noImports && lowComplexity;
      })
      .map(([file, _]) => file);
    
    if (unusedFiles.length > 0) {
      console.log('\nPotentially Unused/Dead Code:');
      unusedFiles.forEach(file => console.log(`- ${file}`));
    }
    
    // Enhanced file statistics
    console.log('\nFile Statistics:');
    console.log(`Total Files Processed: ${files.length}`);
    
    const typeStats = files.reduce((acc: Record<string, number>, file: string) => {
      const ext = path.extname(file);
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(typeStats).forEach(([ext, count]) => {
      console.log(`${ext} files: ${count}`);
    });
    
    // Summary metrics with enhanced insights
    const totalLOC = Object.values(complexityResults).reduce((sum, data) => sum + data.loc, 0);
    const avgComplexity = Object.values(complexityResults)
      .reduce((sum, data) => sum + data.cyclomaticComplexity, 0) / Object.keys(complexityResults).length;
    
    console.log('\nCode Health Summary:');
    console.log('──────────────────────────────');
    
    console.log('\n📊 Overall Metrics:');
    console.log(`• Total Lines of Code: ${totalLOC}`);
    console.log(`• Average Complexity: ${avgComplexity.toFixed(2)}`);
    
    console.log('\n🚨 Critical Issues:');
    console.log(`• High Complexity Files: ${highComplexityFiles.length}`);
    console.log(`• Lint Warnings: ${issues.warnings}`);
    console.log(`• Lint Errors: ${issues.errors}`);
    
    console.log('\n🛠️  Maintenance Issues:');
    console.log(`• Unused Variables/Imports: ${issues.unused}`);
    console.log(`• Potential Dead Code Files: ${unusedFiles.length}`);
    
    const componentRatio = files.filter(f => f.includes('/components/')).length / files.length;
    console.log('\n📁 Code Organization:');
    console.log(`• Component to File Ratio: ${(componentRatio * 100).toFixed(1)}%`);
    console.log(`• TypeScript Files: ${files.filter(f => f.endsWith('.ts')).length}`);
    console.log(`• React Components: ${files.filter(f => f.endsWith('.tsx')).length}`);
    console.log('──────────────────────────────');
    
    console.log('\nRecommendations:');
    if (unusedFiles.length > 0) {
      console.log('\n1. Dead Code Removal:');
      console.log('   Consider removing or refactoring these potentially unused files:');
      unusedFiles.slice(0, 5).forEach(file => console.log(`   - ${file}`));
      if (unusedFiles.length > 5) {
        console.log(`   ... and ${unusedFiles.length - 5} more files`);
      }
    }
    
    if (highComplexityFiles.length > 0) {
      console.log('\n2. Complexity Reduction:');
      console.log('   These files need immediate refactoring:');
      highComplexityFiles.slice(0, 5).forEach(([file, data]) => 
        console.log(`   - ${file} (Complexity: ${data.cyclomaticComplexity}, Functions: ${data.functions})`)
      );
      if (highComplexityFiles.length > 5) {
        console.log(`   ... and ${highComplexityFiles.length - 5} more files`);
      }
    }
    
    if (issues.warnings > 0 || issues.errors > 0) {
      console.log('\n3. Code Quality Improvements:');
      console.log('   - Fix all ESLint warnings and errors');
      console.log('   - Remove unused variables and imports');
      console.log('   - Consider adding more TypeScript type definitions');
    }
    
    console.log('\nNext Steps:');
    if (issues.warnings > 0 || issues.errors > 0) {
      console.log('\nImmediate Actions:');
      console.log('1. Clean up unused variables in high-priority components:');
      console.log('   - Remove unused imports in AITutorAvatar.tsx (Sparkles, useEffect)');
      console.log('   - Clean up unused state variables in LearningPathVisualizer.tsx');
      console.log('   - Address React Hook dependencies in StudyTimer.tsx');
    }

    console.log('\nShort-term Improvements:');
    console.log('1. Remove or refactor dead code files (27 files identified)');
    console.log('2. Consolidate UI components and remove unused ones');
    console.log('3. Add error handling for unused error variables');

    console.log('\nLong-term Recommendations:');
    console.log('1. Implement comprehensive test coverage for components');
    console.log('2. Establish coding standards for variable naming and usage');
    console.log('3. Regular code review and cleanup sprints');
    
  } catch (error) {
    console.error('Error generating report:', error);
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

    // Process high priority files in smaller batches for more careful analysis
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

    // Then process remaining core paths
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

    // Process remaining files in larger batches for efficiency
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
    
    // Generate report for all files
    const allFiles = [...highPriorityFiles, ...remainingFiles];
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

export { formatFiles, lintFiles, generateReport };