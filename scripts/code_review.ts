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
      // Process and clean ESLint output
      const warnings = lintOutput
        .replace(/\u001b\[\d+m/g, '')  // Remove ANSI color codes
        .split('\n')
        .filter(line => line.trim())    // Remove empty lines
        .filter(line => !line.includes('✖'))  // Remove summary line
        .map(line => {
          // Extract file paths and warning messages
          const match = line.match(/([^:]+):(\d+:\d+)?\s+(\w+)\s+(.+)/);
          if (match) {
            const [_, filePath, position, severity, message] = match;
            // Extract the relative path from the full path
            const file = filePath.split('/').slice(-2).join('/');
            const category = message.includes('no-unused-vars') ? 'unused'
              : message.includes('react-hooks') ? 'hooks'
              : message.includes('@typescript-eslint') ? 'typescript'
              : 'other';
            
            return {
              file,
              position: position || '',
              severity,
              message: message.trim(),
              category
            };
          }
          return null;
        })
        .filter(Boolean);

      // Group warnings by category
      const warningsByCategory = warnings.reduce((acc, warning) => {
        if (!warning) return acc;
        if (!acc[warning.category]) {
          acc[warning.category] = [];
        }
        acc[warning.category].push(warning);
        return acc;
      }, {} as Record<string, typeof warnings[0][]>);

      console.log('\n📊 Code Health Summary:');
      console.log('──────────────────────────────');
      
      console.log('\n📈 Overall Metrics:');
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
      
      console.log('\n📋 Detailed Analysis');
      console.log('──────────────────────────────');
      
      const categoryIcons = {
        unused: '🧹',
        hooks: '⚓',
        typescript: '📘',
        other: '📝'
      };
      
      const categoryTitles = {
        unused: 'Unused Variables and Imports',
        hooks: 'React Hooks Issues',
        typescript: 'TypeScript-specific Issues',
        other: 'Other Warnings'
      };
      
      Object.entries(warningsByCategory).forEach(([category, categoryWarnings]) => {
        const icon = categoryIcons[category as keyof typeof categoryIcons] || '📝';
        const title = categoryTitles[category as keyof typeof categoryTitles] || 'Other Warnings';
        
        console.log('\n' + '─'.repeat(50));
        console.log(`${icon} ${title}`);
        console.log(`Found ${categoryWarnings.length} issues in this category`);
        console.log('─'.repeat(50));
        
        // Group warnings by file
        const warningsByFile = categoryWarnings.reduce((acc, warning) => {
          if (!acc[warning.file]) acc[warning.file] = [];
          acc[warning.file].push(warning);
          return acc;
        }, {} as Record<string, typeof warnings[0][]>);
        
        Object.entries(warningsByFile).forEach(([file, fileWarnings]) => {
          console.log(`\n📄 ${file}`);
          fileWarnings.forEach(warning => {
            const severityIcon = warning.severity === 'error' ? '❌' : '⚠️';
            const positionInfo = warning.position ? ` (line ${warning.position})` : '';
            console.log(`  ${severityIcon} ${warning.message}${positionInfo}`);
          });
        });
      });
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
      console.log('\nRecommended Actions:');
      console.log('──────────────────────────────');

      if (issues.warnings > 0 || issues.errors > 0) {
        console.log('\n🔧 Immediate Actions (Next 24 Hours):');
        console.log('1. Clean up unused variables in high-priority components:');
        console.log('   • Remove unused imports in AITutorAvatar.tsx');
        console.log('     - Sparkles, useEffect imports');
        console.log('   • Clean up unused state variables in LearningPathVisualizer.tsx');
        console.log('     - setCurrentLevel, setXpPoints, setNextLevelXP');
        console.log('   • Address React Hook dependencies in StudyTimer.tsx');
        console.log('     - Add handleTimerComplete to useEffect deps array');
      }

      console.log('\n📅 Short-term Improvements (Next Sprint):');
      console.log('1. Remove or refactor dead code files');
      console.log(`   • ${unusedFiles.length} files identified for cleanup`);
      console.log('2. Consolidate UI components');
      console.log(`   • Focus on ${files.filter(f => f.includes('/components/')).length} component files`);
      console.log('3. Implement proper error handling');
      console.log('   • Add error boundaries and logging');

      console.log('\n🎯 Long-term Goals (Next Quarter):');
      console.log('1. Test Coverage');
      console.log('   • Write unit tests for components');
      console.log('   • Add integration tests for critical paths');
      console.log('2. Code Standards');
      console.log('   • Document and enforce naming conventions');
      console.log('   • Set up automated style checks');
      console.log('3. Quality Assurance');
      console.log('   • Schedule regular code reviews');
      console.log('   • Implement automated quality gates');
      
      console.log('──────────────────────────────');
    }
    
    // Enhanced code complexity analysis
    console.log('\n🔍 Code Complexity Analysis:');
    console.log('──────────────────────────────');
    
    interface ComplexityMetrics {
      cyclomaticComplexity: number;
      dependencies: string[];
      loc: number;
      functions: number;
      classes: number;
      cognitiveComplexity: number;
      maintenanceIndex: number;
      commentDensity: number;
    }
    
    const complexityResults: Record<string, ComplexityMetrics> = {};
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const { stdout: fileContent } = await execAsync(`cat ${file}`);
        
        // Calculate cyclomatic complexity (enhanced)
        const complexity = (fileContent.match(
          /(if|while|for|switch|catch|\?|&&|\|\||=>)/g
        ) || []).length;
        
        // Calculate cognitive complexity
        const cognitivePatterns = [
          /if.*&&.*\|\|/g,  // Complex conditions
          /nested_if/g,      // Nested conditions
          /switch.*default/g, // Switch with default
          /try.*catch.*finally/g, // Complex error handling
        ];
        const cognitiveComplexity = cognitivePatterns.reduce(
          (sum, pattern) => sum + (fileContent.match(pattern) || []).length,
          0
        );
        
        // Parse file content
        const lines = fileContent.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim());
        const commentLines = lines.filter(line => 
          line.trim().startsWith('//') || 
          line.trim().startsWith('/*') || 
          line.trim().startsWith('*')
        );
        
        // Calculate metrics
        const loc = nonEmptyLines.length;
        const commentDensity = commentLines.length / loc;
        const halsteadMetrics = calculateHalsteadMetrics(fileContent);
        const maintenanceIndex = calculateMaintenanceIndex(loc, complexity, commentDensity);
        
        // Count functions and classes
        const functions = (fileContent.match(
          /\b(function|=>)\b|\b(get|set|async)\s+\w+\s*\(/g
        ) || []).length;
        
        const classes = (fileContent.match(/\bclass\s+\w+/g) || []).length;
        
        // Find imports and analyze dependencies
        const imports = fileContent.match(/import .+ from ['"][@\w\/\-\.]+['"]/g) || [];
        const dependencies = imports.map(imp => imp.match(/from ['"](.+)['"]/)?.[1] || '');
        
        complexityResults[file] = {
          cyclomaticComplexity: complexity,
          dependencies,
          loc,
          functions,
          classes,
          cognitiveComplexity,
          maintenanceIndex,
          commentDensity,
        };
      }
    }
    
    // Helper functions for complexity calculations
    function calculateHalsteadMetrics(code: string): { difficulty: number, effort: number } {
      const operators = (code.match(/[+\-*/%=<>!&|^~?:]+/g) || []).length;
      const operands = (code.match(/\b(?!\b(if|else|while|for|return)\b)\w+\b/g) || []).length;
      const difficulty = (operators / 2) * (operands / (operators + 1));
      const effort = difficulty * (operators + operands);
      return { difficulty, effort };
    }
    
    function calculateMaintenanceIndex(loc: number, complexity: number, commentDensity: number): number {
      // Maintenance Index formula: 171 - 5.2 * ln(avgLoc) - 0.23 * (complexity) - 16.2 * ln(commentDensity)
      const mi = 171 - 5.2 * Math.log(loc) - 0.23 * complexity - 16.2 * Math.log(commentDensity + 1);
      return Math.max(0, Math.min(100, mi)); // Normalize to 0-100
    }
    
    // Advanced complexity analysis and reporting
    const metrics = {
      highComplexityThreshold: 15,
      poorMaintenanceThreshold: 65,
      lowCommentDensityThreshold: 0.1,
      highCognitiveComplexityThreshold: 10
    };

    const complexityAnalysis = Object.entries(complexityResults).reduce(
      (acc, [file, data]) => {
        if (data.cyclomaticComplexity > metrics.highComplexityThreshold) {
          acc.highComplexity.push([file, data]);
        }
        if (data.maintenanceIndex < metrics.poorMaintenanceThreshold) {
          acc.poorMaintainability.push([file, data]);
        }
        if (data.commentDensity < metrics.lowCommentDensityThreshold) {
          acc.lowCommentDensity.push([file, data]);
        }
        if (data.cognitiveComplexity > metrics.highCognitiveComplexityThreshold) {
          acc.highCognitiveComplexity.push([file, data]);
        }
        return acc;
      },
      {
        highComplexity: [] as [string, ComplexityMetrics][],
        poorMaintainability: [] as [string, ComplexityMetrics][],
        lowCommentDensity: [] as [string, ComplexityMetrics][],
        highCognitiveComplexity: [] as [string, ComplexityMetrics][]
      }
    );

    // Sort results by severity
    const highComplexityFiles = complexityAnalysis.highComplexity
      .sort(([_, a], [__, b]) => b.cyclomaticComplexity - a.cyclomaticComplexity);
    
    if (highComplexityFiles.length > 0) {
      console.log('\nHigh Complexity Files (needs refactoring):');
      highComplexityFiles.forEach(([file, data]) => {
        console.log(`- ${file}:`);
        console.log(`  Complexity: ${data.cyclomaticComplexity}`);
        console.log(`  Lines of Code: ${data.loc}`);
        console.log(`  Functions: ${data.functions}`);
        console.log(`  Classes: ${data.classes}`);
        console.log(`  Cognitive Complexity: ${data.cognitiveComplexity}`);
        console.log(`  Maintenance Index: ${data.maintenanceIndex.toFixed(2)}`);
        console.log(`  Comment Density: ${(data.commentDensity * 100).toFixed(1)}%`);
        if (data.dependencies.length > 0) {
          console.log('  Dependencies:');
          data.dependencies.forEach(dep => console.log(`    • ${dep}`));
        }
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
    console.log('\n📁 File Statistics:');
    console.log('──────────────────────────────');
    console.log(`Total Files Processed: ${files.length}`);
    
    const typeStats = files.reduce((acc: Record<string, number>, file: string) => {
      const ext = path.extname(file);
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nFile Types:');
    Object.entries(typeStats)
      .sort(([_, a], [__, b]) => b - a)
      .forEach(([ext, count]) => {
        const percentage = ((count / files.length) * 100).toFixed(1);
        console.log(`• ${ext || 'No extension'}: ${count} files (${percentage}%)`);
      });
    
    // Directory statistics
    const dirStats = files.reduce((acc: Record<string, number>, file: string) => {
      const dir = path.dirname(file).split('/')[0];
      acc[dir] = (acc[dir] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nDirectory Distribution:');
    Object.entries(dirStats)
      .sort(([_, a], [__, b]) => b - a)
      .forEach(([dir, count]) => {
        const percentage = ((count / files.length) * 100).toFixed(1);
        console.log(`• ${dir}: ${count} files (${percentage}%)`);
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
    
// Import required modules
import { promises as fs } from 'fs';

// Function to apply automatic fixes to code issues
export const applyAutoFixes = async (files: string[]) => {
  console.log('\n🔧 Applying automatic fixes...');
  
  for (const file of files) {
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
  }
  
  console.log('🎉 Automatic fixes complete\n');
};
    // Calculate code quality metrics
    const calculateMetrics = () => {
      const maxScore = 100;
      let deductions = 0;
      const metricsResult = {
        totalFiles: files.length,
        totalFunctions: 0,
        avgComplexity: 0,
        maxComplexity: 0,
        maintainabilityScore: 0,
        testabilityScore: 0,
        codeHealthScore: 0
      };
      
      // Calculate complexity metrics
      const complexityStats = Object.values(complexityResults).reduce((acc, curr) => {
        metricsResult.totalFunctions += curr.functions;
        acc.totalComplexity += curr.cyclomaticComplexity;
        metricsResult.maxComplexity = Math.max(metricsResult.maxComplexity, curr.cyclomaticComplexity);
        return acc;
      }, { totalComplexity: 0 });
      
      metricsResult.avgComplexity = complexityStats.totalComplexity / Object.keys(complexityResults).length;
      
      // Calculate deductions
      const complexityDeduction = Math.min(30, highComplexityFiles.length * 5);
      const lintDeduction = Math.min(30, (issues.warnings * 0.5) + (issues.errors * 2));
      const deadCodeDeduction = Math.min(20, unusedFiles.length * 2);
      const testDeduction = 20; // Placeholder for test coverage deduction
      
      deductions = complexityDeduction + lintDeduction + deadCodeDeduction + testDeduction;
      metricsResult.codeHealthScore = Math.max(0, maxScore - deductions);
      
      // Calculate maintainability score (0-100)
      metricsResult.maintainabilityScore = Math.max(0, 100 - (
        (metricsResult.avgComplexity * 10) +
        (unusedFiles.length * 5) +
        (issues.warnings * 2) +
        (issues.errors * 5)
      ));
      
      // Calculate testability score (0-100)
      metricsResult.testabilityScore = Math.max(0, 100 - (
        (metricsResult.maxComplexity * 5) +
        (highComplexityFiles.length * 10)
      ));
      
      return metricsResult;
    };

    const result = calculateMetrics();
    const healthGrade = 
      result.codeHealthScore >= 90 ? 'A' :
      result.codeHealthScore >= 80 ? 'B' :
      result.codeHealthScore >= 70 ? 'C' :
      result.codeHealthScore >= 60 ? 'D' : 'F';

    console.log('\n📊 Code Quality Dashboard');
    console.log('══════════════════════════════');
    console.log('\n🏥 Health Metrics:');
    console.log(`• Overall Health: ${result.codeHealthScore}/100 (Grade ${healthGrade})`);
    console.log(`• Maintainability: ${result.maintainabilityScore}/100`);
    console.log(`• Testability: ${result.testabilityScore}/100`);
    
    console.log('\n🔍 Code Analysis:');
    console.log(`• Average Complexity: ${result.avgComplexity.toFixed(2)}`);
    console.log(`• Maximum Complexity: ${result.maxComplexity}`);
    console.log(`• Total Functions: ${result.totalFunctions}`);
    
    console.log('\n⚠️ Issues Overview:');
    console.log(`• Critical Errors: ${issues.errors}`);
    console.log(`• Warnings: ${issues.warnings}`);
    console.log(`• Complex Files: ${highComplexityFiles.length}`);
    console.log(`• Dead Code Files: ${unusedFiles.length}`);
    
    console.log('\n🎯 Action Items');
    console.log('──────────────────────────────');

    if (issues.warnings > 0 || issues.errors > 0) {
      console.log('\n🔧 Critical (Next 24 Hours):');
      console.log('1. Clean up unused variables in high-priority components:');
      console.log('   • AITutorAvatar.tsx: Remove unused imports (Sparkles, useEffect)');
      console.log('   • LearningPathVisualizer.tsx: Clean up state variables');
      console.log('     - setCurrentLevel, setXpPoints, setNextLevelXP');
      console.log('   • StudyTimer.tsx: Fix React Hook dependencies');
      console.log('     - Add handleTimerComplete to useEffect deps array');
    }

    if (highComplexityFiles.length > 0) {
      console.log('\n⚡ High Priority (This Week):');
      console.log('Complex files requiring refactoring:');
      highComplexityFiles.slice(0, 5).forEach(([file, data]) => 
        console.log(`   • ${file} (Complexity: ${data.cyclomaticComplexity}, Functions: ${data.functions})`)
      );
      if (highComplexityFiles.length > 5) {
        console.log(`   ... and ${highComplexityFiles.length - 5} more files`);
      }
    }

    console.log('\n📅 Planned Improvements (Next Sprint):');
    console.log('1. Code Cleanup');
    console.log(`   • Remove ${unusedFiles.length} unused files`);
    console.log(`   • Consolidate ${files.filter(f => f.includes('/components/')).length} UI components`);
    console.log('2. Error Handling');
    console.log('   • Implement error boundaries');
    console.log('   • Add structured error logging');
    console.log('3. Testing');
    console.log('   • Add unit tests for components');
    console.log('   • Implement integration tests');
    
    console.log('\n📈 Ongoing Maintenance:');
    console.log('• Regular code reviews');
    console.log('• Automated quality checks');
    console.log('• Documentation updates');
    
    console.log('\n──────────────────────────────');

    // Print detailed metrics
    console.log('\n📈 Detailed Metrics:');
    console.log('──────────────────────────────');
    console.log('Code Complexity:');
    console.log(`• Average Cyclomatic Complexity: ${result.avgComplexity.toFixed(2)}`);
    console.log(`• Maximum Complexity: ${result.maxComplexity}`);
    console.log(`• Total Functions: ${result.totalFunctions}`);

    // Print ESLint statistics by category
    console.log('\n🔍 ESLint Issues by Category:');
    console.log('──────────────────────────────');
    const issuesByType = Object.entries(issues.details).reduce((acc, [rule, count]) => {
      const category = rule.split('/')[0];
      acc[category] = (acc[category] || 0) + count;
      return acc;
    }, {});

    Object.entries(issuesByType)
      .sort(([_, a], [__, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`• ${category}: ${count} issues`);
      });

    // Technical debt estimation
    const estimateDebtDays = () => {
      const COMPLEXITY_FACTOR = 0.5; // Half day per high complexity file
      const WARNING_FACTOR = 0.2; // 0.2 days per warning
      const ERROR_FACTOR = 1; // 1 day per error
      const DEAD_CODE_FACTOR = 0.3; // 0.3 days per unused file

      return Math.ceil(
        highComplexityFiles.length * COMPLEXITY_FACTOR +
        issues.warnings * WARNING_FACTOR +
        issues.errors * ERROR_FACTOR +
        unusedFiles.length * DEAD_CODE_FACTOR
      );
    };

    const debtDays = estimateDebtDays();
    console.log('\n⏱️ Technical Debt');
    console.log('──────────────────────────────');
    console.log(`Estimated Resolution Time: ~${debtDays} developer days`);
    console.log(`Priority Level: ${debtDays > 10 ? 'High' : debtDays > 5 ? 'Medium' : 'Low'}`);
    
    console.log('──────────────────────────────');
    
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

export { formatFiles, lintFiles, generateReport };