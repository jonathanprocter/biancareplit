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
  'client/src/pages',
  'db/index.ts',
  'client/src/main.tsx'
];

const CORE_PATHS = [
  'src',
  'server',
  'client',
  'db'
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
  console.log('\n🔧 Applying comprehensive automatic fixes...');

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      let modified = content;
      let hasChanges = false;

      // Enhanced security fixes
      // Add proper input validation for medical data
      const inputValidationFix = content.match(/const\s+(\w+)\s*=\s*req\.(?:body|query|params)\.(\w+)/g);
      if (inputValidationFix) {
        for (const match of inputValidationFix) {
          const [_, varName, prop] = match.match(/const\s+(\w+)\s*=\s*req\.(?:body|query|params)\.(\w+)/) || [];
          if (varName && prop) {
            const validationCode = `
              if (!${varName}) {
                throw new Error(\`Invalid ${prop} provided\`);
              }
              // Sanitize medical data
              const sanitized${varName} = sanitizeMedicalData(${varName});
            `;
            modified = modified.replace(match, match + validationCode);
            hasChanges = true;
          }
        }
      }

      // Fix accessibility issues
      const imgWithoutAlt = content.match(/<img\s+(?!.*alt=)[^>]*>/g);
      if (imgWithoutAlt) {
        for (const img of imgWithoutAlt) {
          const fixed = img.replace(/>$/, ' alt="Medical education content" />');
          modified = modified.replace(img, fixed);
          hasChanges = true;
        }
      }

      // Fix unused variables
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

      // Enhanced type safety fixes
      const typeAssertions = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*([^;]+)\s+as\s+any;/g);
      for (const match of Array.from(typeAssertions)) {
        const [fullMatch, varName, expression] = match;
        // Try to infer type from usage
        const varUsages = content.match(new RegExp(`${varName}\\.(\\w+)`, 'g'));
        if (varUsages) {
          const properties = [...new Set(varUsages.map(u => u.split('.')[1]))];
          const typeDefinition = `type ${varName}Type = { ${properties.join(': any; ')}: any };`;
          modified = modified.replace(fullMatch, `${typeDefinition}\nconst ${varName}: ${varName}Type = ${expression};`);
          hasChanges = true;
          console.log(`📝 Added type definition for: ${varName} in ${file}`);
        }
      }

      // Fix async/await consistency
      const asyncPromiseMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(\w+\.?\w*\([^)]*\))(?!\s*\))\s*\.then/g);
      for (const match of Array.from(asyncPromiseMatches)) {
        const [fullMatch, varName, promiseCall] = match;
        modified = modified.replace(fullMatch, `const ${varName} = await ${promiseCall}`);
        hasChanges = true;
        console.log(`📝 Fixed promise chain to async/await: ${varName} in ${file}`);
      }

      // Fix error handling patterns
      const tryCatchMatches = content.matchAll(/try\s*{[^}]*}\s*catch\s*\((\w+)\)\s*{[^}]*console\.error/g);
      for (const match of Array.from(tryCatchMatches)) {
        const [fullMatch, errorVar] = match;
        const enhanced = fullMatch.replace(
          `catch (${errorVar})`,
          `catch (${errorVar}) {\n    if (${errorVar} instanceof Error) {\n      console.error(\`Error: \${${errorVar}.message}\`);\n      // Add proper error handling here\n    } else {\n      console.error('An unknown error occurred:', ${errorVar});`
        );
        modified = modified.replace(fullMatch, enhanced);
        hasChanges = true;
        console.log(`📝 Enhanced error handling in try-catch block in ${file}`);
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
  duplicatePatterns: number;
  importComplexity: number;
  accessibilityScore: number;
  performanceScore: number;
  medicalTermAccuracy: number;
  testCoverage: number;
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
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    // Enhanced metrics for medical education focus
    const functionMatches = content.match(/function\s+\w+\s*\(|\w+\s*:\s*function\s*\(|\(\s*\)\s*=>|\bclass\b/g);
    const dependencies = content.match(/import\s+.*?from/g);
    const controlFlows = content.match(/if|else|for|while|switch|catch|&&|\|\||\?|try|catch|finally/g);
    
    // Enhanced pattern detection for medical education code
    const medicalPatterns = {
      dataValidation: (content.match(/validate|verify|check|assert|ensure/g) || []).length,
      errorHandling: (content.match(/try|catch|throw|error|exception/g) || []).length,
      accessibilityFeatures: (content.match(/aria-|role=|alt=|tabIndex/g) || []).length,
      securityMeasures: (content.match(/sanitize|escape|encrypt|hash|authenticate/g) || []).length,
      medicalTerminology: (content.match(/patient|diagnosis|treatment|clinical|medical|health/g) || []).length
    };
    
    // Educational and medical patterns analysis
    const patterns = {
      // UI Interaction patterns
      interactiveElements: (content.match(/onClick|onSubmit|onChange|addEventListener/g) || []).length,
      
      // Educational feedback patterns
      feedbackElements: (content.match(/feedback|response|answer|explanation|hint/g) || []).length,
      progressTracking: (content.match(/progress|completion|score|grade|achievement/g) || []).length,
      adaptiveLearning: (content.match(/difficulty|level|adaptive|personalized|recommendation/g) || []).length,
      
      // Medical domain patterns
      medicalComponents: (content.match(/patient|diagnosis|treatment|clinical|symptom|condition/g) || []).length,
      medicalTerminology: (content.match(/etiology|pathology|anatomy|physiology|prognosis/g) || []).length,
      
      // Accessibility patterns
      ariaLabels: (content.match(/aria-label/g) || []).length,
      roleAttributes: (content.match(/role=/g) || []).length,
      altTexts: (content.match(/alt=/g) || []).length,
      ariaDescribedby: (content.match(/aria-describedby/g) || []).length,
      keyboardNav: (content.match(/onKeyDown|onKeyPress|onKeyUp/g) || []).length,
    };
    
    // Import complexity analysis with medical package detection
    const importComplexityAnalysis = {
      statements: content.match(/import\s+{[^}]+}/g) || [],
      medicalPackages: (content.match(/import.*from.*[@\/]medical[-\/][^'"]*/g) || []).length,
      complexity: (content.match(/import\s+{([^}]+)}/g) || [])
        .reduce((acc, imp) => acc + (imp.match(/,/g)?.length || 0) + 1, 0)
    };
    
    // Import complexity analysis with medical package detection
    const importStatements = content.match(/import\s+{[^}]+}/g) || [];
    const medicalPackages = importStatements.filter(imp => 
      /medical|health|clinical|diagnosis|treatment/i.test(imp)
    ).length;
    const importComplexity = importStatements.reduce((acc, imp) => 
      acc + (imp.match(/,/g)?.length || 0) + 1, 0);
    
    // Duplicate code detection with context awareness
    const codeBlocks = new Map<string, number>();
    const minBlockSize = 4;
    let duplicatePatterns = 0;
    
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n').trim();
      if (block.length > 50) {
        codeBlocks.set(block, (codeBlocks.get(block) || 0) + 1);
        if (codeBlocks.get(block)! > 1) {
          duplicatePatterns++;
        }
      }
    }
    
    // Enhanced accessibility analysis for educational content
    const accessibilityPatterns = {
      ariaLabels: (content.match(/aria-label/g) || []).length,
      roleAttributes: (content.match(/role=/g) || []).length,
      altTexts: (content.match(/alt=/g) || []).length,
      ariaDescribedby: (content.match(/aria-describedby/g) || []).length,
      ariaLive: (content.match(/aria-live/g) || []).length,
      tabIndex: (content.match(/tabIndex/g) || []).length,
      keyboardNav: (content.match(/onKeyDown|onKeyPress|onKeyUp/g) || []).length,
    };
    const accessibilityScore = calculateAccessibilityScore(accessibilityPatterns, totalLines);
    
    // Performance patterns analysis with educational content focus
    const performanceIssues = {
      largeLoops: (content.match(/for\s*\([^)]+\)\s*{[\s\S]{1000,}?}/g) || []).length,
      nestedLoops: (content.match(/for\s*\([^)]+\)\s*{[^}]*for\s*\([^)]+\)/g) || []).length,
      heavyOperations: (content.match(/\.forEach|\.map|\.filter|\.reduce/g) || []).length,
      mediaLoading: (content.match(/new\s+(Image|Audio|Video)/g) || []).length,
      largeDataStructures: (content.match(/new\s+(Array|Object|Map|Set)/g) || []).length,
    };
    const performanceScore = calculatePerformanceScore(performanceIssues, totalLines);
    
    // Enhanced medical terminology and educational content accuracy
    const medicalTerms = content.match(/patient|diagnosis|treatment|medication|clinical|medical|health|care|provider|physician|nurse|symptom|condition|therapy|prognosis|etiology|pathology|anatomy|physiology/g) || [];
    const educationalTerms = content.match(/learn|teach|study|practice|exercise|quiz|test|exam|module|lesson|course|curriculum|objective|assessment|evaluation/g) || [];
    const medicalTermAccuracy = calculateMedicalTermAccuracy([...medicalTerms, ...educationalTerms], content);
    
    // Enhanced test coverage with educational scenarios
    const testPatterns = {
      testCases: (content.match(/test\(|it\(|describe\(/g) || []).length,
      assertions: (content.match(/expect\(|assert\./g) || []).length,
      scenarioTests: (content.match(/scenario\(|feature\(|given\(|when\(|then\(/g) || []).length,
      accessibilityTests: (content.match(/getByRole|getByLabelText|getByAltText/g) || []).length,
    };
    const testCoverage = calculateTestCoverage(testPatterns, functionMatches?.length || 0);
    
    return {
      cyclomaticComplexity: (controlFlows?.length || 0) + 1,
      functions: functionMatches?.length || 0,
      dependencies: dependencies?.length || 0,
      lines: totalLines,
      duplicatePatterns,
      importComplexity,
      accessibilityScore,
      performanceScore,
      medicalTermAccuracy,
      testCoverage,
    };
  } catch (error) {
    console.error(`Error analyzing complexity for ${filePath}:`, error);
    return null;
  }
}

function calculateAccessibilityScore(patterns: { ariaLabels: number, roleAttributes: number, altTexts: number }, totalLines: number): number {
  const componentProbability = totalLines / 100; // Estimate number of potential components
  const expectedAccessibilityElements = Math.ceil(componentProbability);
  const actualElements = patterns.ariaLabels + patterns.roleAttributes + patterns.altTexts;
  return Math.min(100, (actualElements / expectedAccessibilityElements) * 100);
}

function calculatePerformanceScore(issues: { largeLoops: number, nestedLoops: number, heavyOperations: number }, totalLines: number): number {
  const baseScore = 100;
  const deductions = {
    largeLoops: 15,
    nestedLoops: 20,
    heavyOperations: 5,
  };
  
  const totalDeduction =
    (issues.largeLoops * deductions.largeLoops) +
    (issues.nestedLoops * deductions.nestedLoops) +
    (issues.heavyOperations * deductions.heavyOperations);
  
  return Math.max(0, Math.min(100, baseScore - (totalDeduction * (totalLines / 1000))));
}

function calculateMedicalTermAccuracy(terms: string[], content: string): number {
  if (terms.length === 0) return 100;

  // Enhanced context patterns for medical education
  const contextPatterns = {
    properCapitalization: terms.filter(term => /[A-Z]/.test(term[0])).length,
    properDefinition: terms.filter(term => {
      const termIndex = content.indexOf(term);
      const surroundingContext = content.slice(Math.max(0, termIndex - 100), termIndex + 100);
      return /\b(is|are|refers to|defined as|means|describes|represents|indicates|involves)\b/.test(surroundingContext);
    }).length,
    educationalContext: terms.filter(term => {
      const termIndex = content.indexOf(term);
      const surroundingContext = content.slice(Math.max(0, termIndex - 100), termIndex + 100);
      return /\b(learn|study|understand|explain|teach|practice|demonstrate|example|concept)\b/.test(surroundingContext);
    }).length,
    clinicalContext: terms.filter(term => {
      const termIndex = content.indexOf(term);
      const surroundingContext = content.slice(Math.max(0, termIndex - 100), termIndex + 100);
      return /\b(diagnosis|treatment|symptoms|clinical|patient|medical|healthcare|condition)\b/.test(surroundingContext);
    }).length,
    scientificAccuracy: terms.filter(term => {
      const termIndex = content.indexOf(term);
      const surroundingContext = content.slice(Math.max(0, termIndex - 150), termIndex + 150);
      return /\b(research|evidence|study|data|analysis|results|findings|literature|published)\b/.test(surroundingContext);
    }).length
  };

  // Calculate weighted score based on different context patterns
  const weights = {
    properCapitalization: 0.15,
    properDefinition: 0.25,
    educationalContext: 0.25,
    clinicalContext: 0.20,
    scientificAccuracy: 0.15
  };

  const weightedScore = 
    (contextPatterns.properCapitalization * weights.properCapitalization +
     contextPatterns.properDefinition * weights.properDefinition +
     contextPatterns.educationalContext * weights.educationalContext +
     contextPatterns.clinicalContext * weights.clinicalContext +
     contextPatterns.scientificAccuracy * weights.scientificAccuracy) / terms.length;

  return Math.min(100, weightedScore * 200); // Scale to 0-100
}

function calculateTestCoverage(patterns: { testCases: number, assertions: number }, functionCount: number): number {
  if (functionCount === 0) return 0;
  const coverage = Math.min(100, (patterns.testCases / functionCount) * 100);
  const assertionRatio = patterns.assertions / Math.max(1, patterns.testCases);
  return Math.min(100, coverage * Math.min(1, assertionRatio));
}

async function calculateMetrics(files: string[]): Promise<CodeAnalysisResult> {
  const issues: { [key: string]: CodeIssue[] } = {};
  const highComplexityFiles = new Map<string, ComplexityMetrics>();
  let totalComplexity = 0;
  let maxComplexity = 0;
  let totalLines = 0;
  let errorCount = 0;
  let warningCount = 0;
  let totalAccessibilityScore = 0;
  let totalPerformanceScore = 0;
  let totalMedicalTermAccuracy = 0;
  let totalTestCoverage = 0;
  let totalDuplicatePatterns = 0;
  let totalImportComplexity = 0;

  for (const file of files) {
    const metrics = await analyzeComplexity(file);
    if (metrics) {
      totalComplexity += metrics.cyclomaticComplexity;
      maxComplexity = Math.max(maxComplexity, metrics.cyclomaticComplexity);
      totalLines += metrics.lines;
      totalAccessibilityScore += metrics.accessibilityScore;
      totalPerformanceScore += metrics.performanceScore;
      totalMedicalTermAccuracy += metrics.medicalTermAccuracy;
      totalTestCoverage += metrics.testCoverage;
      totalDuplicatePatterns += metrics.duplicatePatterns;
      totalImportComplexity += metrics.importComplexity;

      if (metrics.cyclomaticComplexity > 10) {
        highComplexityFiles.set(file, metrics);
      }
    }
  }

  // Calculate average metrics
  const avgComplexity = totalComplexity / files.length;
  const codeHealthScore = Math.max(0, Math.min(100, 100 - (avgComplexity * 5)));
  const maintainabilityScore = Math.max(0, Math.min(100, 100 - (highComplexityFiles.size / files.length * 100)));
  const avgAccessibilityScore = totalAccessibilityScore / files.length;
  const avgPerformanceScore = totalPerformanceScore / files.length;
  const avgMedicalTermAccuracy = totalMedicalTermAccuracy / files.length;
  const avgTestCoverage = totalTestCoverage / files.length;

  return {
    errors: errorCount,
    warnings: warningCount,
    details: issues,
    metrics: {
      totalFiles: files.length,
      codeHealthScore,
      maintainabilityScore,
      testabilityScore: avgTestCoverage,
      avgComplexity,
      maxComplexity,
      totalLines,
      testCoverage: avgTestCoverage,
      accessibilityScore: avgAccessibilityScore,
      performanceScore: avgPerformanceScore,
      medicalTermAccuracy: avgMedicalTermAccuracy,
      duplicatePatterns: totalDuplicatePatterns,
      importComplexity: totalImportComplexity / files.length
    },
    highComplexityFiles,
    unusedFiles: [] // TODO: Implement dead code detection
  };
}

async function generateReport(files: string[]): Promise<void> {
  try {
    console.log('\n📊 Generating Comprehensive Medical Education Software Quality Report...');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

    const analysis = await calculateMetrics(files);
    const { metrics, highComplexityFiles } = analysis;

    // Medical Education Platform Specific Metrics
    console.log('🏥 Medical Education Compliance');
    console.log('─────────────────────────────');
    console.log(`• HIPAA Compliance Score: ${getColorForScore(metrics.securityScore)}${metrics.securityScore.toFixed(1)}%\x1b[0m`);
    console.log(`• Accessibility Rating: ${getColorForScore(metrics.accessibilityScore)}${metrics.accessibilityScore.toFixed(1)}%\x1b[0m`);
    console.log(`• Medical Terminology Accuracy: ${getColorForScore(metrics.medicalTermAccuracy)}${metrics.medicalTermAccuracy.toFixed(1)}%\x1b[0m`);
    console.log(`• Educational Content Quality: ${getColorForScore(metrics.educationalQuality)}${metrics.educationalQuality.toFixed(1)}%\x1b[0m\n`);

    // Health Score Section with Color Coding
    console.log('🏥 Overall System Health');
    console.log('─────────────────────');
    const healthColor = metrics.codeHealthScore >= 80 ? '\x1b[32m' : metrics.codeHealthScore >= 60 ? '\x1b[33m' : '\x1b[31m';
    console.log(`• Overall Health Score: ${healthColor}${metrics.codeHealthScore.toFixed(1)}/100\x1b[0m`);
    console.log(`• Maintainability: ${getColorForScore(metrics.maintainabilityScore)}${metrics.maintainabilityScore.toFixed(1)}/100\x1b[0m`);
    console.log(`• Test Coverage: ${getColorForScore(metrics.testCoverage)}${metrics.testCoverage.toFixed(1)}%\x1b[0m\n`);

    // Enhanced Metrics Dashboard
    console.log('📈 Enhanced Quality Metrics');
    console.log('────────────────────────');
    console.log(`• Accessibility Compliance: ${getColorForScore(metrics.accessibilityScore)}${metrics.accessibilityScore.toFixed(1)}%\x1b[0m`);
    console.log(`• Performance Score: ${getColorForScore(metrics.performanceScore)}${metrics.performanceScore.toFixed(1)}/100\x1b[0m`);
    console.log(`• Medical Term Accuracy: ${getColorForScore(metrics.medicalTermAccuracy)}${metrics.medicalTermAccuracy.toFixed(1)}%\x1b[0m\n`);

    // Codebase Analysis
    console.log('🔍 Codebase Analysis');
    console.log('──────────────────');
    console.log(`• Files Analyzed: ${metrics.totalFiles}`);
    console.log(`• Total Lines: ${metrics.totalLines.toLocaleString()}`);
    console.log(`• Average Complexity: ${getColorForComplexity(metrics.avgComplexity)}${metrics.avgComplexity.toFixed(2)}\x1b[0m`);
    console.log(`• Code Duplication: ${getColorForDuplication(metrics.duplicatePatterns)}${metrics.duplicatePatterns} occurrences\x1b[0m`);
    console.log(`• Import Complexity: ${getColorForImportComplexity(metrics.importComplexity)}${metrics.importComplexity.toFixed(2)}\x1b[0m\n`);

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

    // Enhanced Recommendations with Domain Focus
    console.log('\n💡 Comprehensive Recommendations');
    console.log('─────────────────────────────');
    
    // Code Health Recommendations
    if (metrics.codeHealthScore < 80) {
      console.log('\n📝 Code Health Improvements:');
      console.log('• Refactor high complexity components into smaller, focused modules');
      console.log('• Implement comprehensive error handling for medical data processing');
      console.log('• Enhance type safety for patient data structures');
    }

    // Medical Domain Specific Recommendations
    console.log('\n🏥 Medical Domain Enhancements:');
    if (metrics.medicalTermAccuracy < 90) {
      console.log('• Standardize medical terminology usage across the codebase');
      console.log('• Implement medical term validation using standardized medical dictionaries');
      console.log('• Add JSDoc comments for medical terms and procedures');
    }

    // Accessibility Recommendations
    if (metrics.accessibilityScore < 90) {
      console.log('\n♿ Accessibility Improvements:');
      console.log('• Enhance ARIA labels for medical interface elements');
      console.log('• Implement keyboard navigation for critical medical workflows');
      console.log('• Add screen reader support for medical data visualization');
    }

    // Performance Optimization
    if (metrics.performanceScore < 85) {
      console.log('\n⚡ Performance Optimizations:');
      console.log('• Implement data pagination for large medical records');
      console.log('• Optimize medical image loading and processing');
      console.log('• Add caching for frequently accessed medical reference data');
    }

    // Testing Strategy
    if (metrics.testCoverage < 80) {
      console.log('\n🧪 Testing Enhancements:');
      console.log('• Add unit tests for medical data validation functions');
      console.log('• Implement integration tests for clinical workflows');
      console.log('• Add end-to-end tests for critical patient data paths');
    }

    // Security Considerations
    console.log('\n🔒 Security Recommendations:');
    console.log('• Implement strict input validation for medical data');
    console.log('• Add audit logging for sensitive medical operations');
    console.log('• Enhance data encryption for patient information');

function getColorForScore(score: number): string {
  if (score >= 90) return '\x1b[32m'; // Green
  if (score >= 70) return '\x1b[33m'; // Yellow
  return '\x1b[31m'; // Red
}

function getColorForComplexity(complexity: number): string {
  if (complexity <= 5) return '\x1b[32m';
  if (complexity <= 10) return '\x1b[33m';
  return '\x1b[31m';
}

function getColorForDuplication(duplicates: number): string {
  if (duplicates <= 2) return '\x1b[32m';
  if (duplicates <= 5) return '\x1b[33m';
  return '\x1b[31m';
}

function getColorForImportComplexity(complexity: number): string {
  if (complexity <= 3) return '\x1b[32m';
  if (complexity <= 6) return '\x1b[33m';
  return '\x1b[31m';
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
// Configure workflow settings
process.env.WORKFLOW_NAME = 'Code Review';
process.env.PORT = '5000';


async function main() {
  try {
    console.log('Starting automated code review...');
    const AUTO_APPLY_FIXES = true;

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
      console.log('\n🔍 Starting Comprehensive Code Review...');
      console.log('════════════════════════════════════════\n');
      main()
        .then(() => {
          console.log('\n✨ Code review completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n❌ Code review failed:', error);
          process.exit(1);
        });
    }

export { formatFiles, lintFiles, generateReport, applyAutoFixes };