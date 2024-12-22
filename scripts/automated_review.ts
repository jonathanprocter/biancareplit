import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// High priority paths for medical education platform
const HIGH_PRIORITY_PATHS = [
  'client/src/components',
  'server/services',
  'server/routes.ts',
  'db/schema.ts',
  'server/index.ts',
  'client/src/pages'
];

// Core paths for the application
const CORE_PATHS = [
  'src',
  'server',
  'client',
  'db'
];

// Patterns to ignore during review
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

interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  source?: string;
}

interface ReviewResult {
  issues: CodeIssue[];
  stats: {
    filesChecked: number;
    issuesFound: number;
    fixesApplied: number;
    duration: number;
  };
}

async function getTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
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
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return files;
}

async function formatFiles(files: string[]): Promise<void> {
  console.log('🎨 Running Prettier...');
  try {
    for (const file of files) {
      await execAsync(`npx prettier --write "${file}"`);
    }
    console.log('✅ Prettier formatting complete');
  } catch (error) {
    console.error('❌ Error running Prettier:', error);
    throw error;
  }
}

async function lintFiles(files: string[]): Promise<void> {
  console.log('🔍 Running ESLint...');
  try {
    for (const file of files) {
      await execAsync(`npx eslint --fix "${file}"`);
    }
    console.log('✅ ESLint fixes complete');
  } catch (error) {
    console.error('❌ Error running ESLint:', error);
    throw error;
  }
}

async function typeCheck(files: string[]): Promise<void> {
  console.log('📝 Running TypeScript type check...');
  try {
    await execAsync('npx tsc --noEmit');
    console.log('✅ TypeScript check complete');
  } catch (error) {
    console.error('❌ Type check errors found:', error);
    throw error;
  }
}

async function checkAccessibility(files: string[]): Promise<CodeIssue[]> {
  const issues: CodeIssue[] = [];
  console.log('♿ Checking accessibility...');

  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for missing aria labels
      const imgWithoutAlt = content.match(/<img[^>]+(?!alt=)[^>]*>/g);
      if (imgWithoutAlt) {
        issues.push({
          type: 'error',
          message: 'Image missing alt text',
          file,
          source: 'accessibility'
        });
      }

      // Check for proper heading hierarchy
      const headings = content.match(/<h[1-6][^>]*>/g);
      if (headings) {
        let prevLevel = 0;
        headings.forEach(heading => {
          const level = parseInt(heading[2]);
          if (level > prevLevel + 1) {
            issues.push({
              type: 'warning',
              message: `Skipped heading level: h${prevLevel} to h${level}`,
              file,
              source: 'accessibility'
            });
          }
          prevLevel = level;
        });
      }
    }
  }

  return issues;
}

async function checkSecurityIssues(files: string[]): Promise<CodeIssue[]> {
  const issues: CodeIssue[] = [];
  console.log('🔒 Checking security issues...');

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');

    // Check for hardcoded secrets
    const secretPatterns = [
      /const\s+\w+\s*=\s*['"][A-Za-z0-9_-]{20,}['"]/g,
      /api[Kk]ey\s*=\s*['"][A-Za-z0-9_-]{20,}['"]/g,
      /password\s*=\s*['"][^'"]+['"]/g
    ];

    secretPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'error',
          message: 'Potential hardcoded secret detected',
          file,
          source: 'security'
        });
      }
    });

    // Check for unsafe data handling
    if (content.includes('dangerouslySetInnerHTML')) {
      issues.push({
        type: 'warning',
        message: 'Unsafe innerHTML usage detected',
        file,
        source: 'security'
      });
    }
  }

  return issues;
}

async function reviewCode(): Promise<ReviewResult> {
  const startTime = Date.now();
  const issues: CodeIssue[] = [];
  let filesChecked = 0;
  let fixesApplied = 0;

  try {
    console.log('\n🔍 Starting Medical Education Platform Code Review');
    console.log('═══════════════════════════════════════════════════\n');

    // Get all TypeScript files
    const files: string[] = [];
    for (const dir of CORE_PATHS) {
      files.push(...await getTypeScriptFiles(dir));
    }
    filesChecked = files.length;

    // Format and lint
    await formatFiles(files);
    fixesApplied++;
    await lintFiles(files);
    fixesApplied++;

    // Type check
    await typeCheck(files);

    // Additional checks
    const accessibilityIssues = await checkAccessibility(files);
    const securityIssues = await checkSecurityIssues(files);

    issues.push(...accessibilityIssues, ...securityIssues);

    const duration = Date.now() - startTime;

    // Generate report
    console.log('\n📊 Code Review Summary');
    console.log('═══════════════════');
    console.log(`Files checked: ${filesChecked}`);
    console.log(`Issues found: ${issues.length}`);
    console.log(`Fixes applied: ${fixesApplied}`);
    console.log(`Duration: ${duration}ms`);

    if (issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      issues.forEach(issue => {
        console.log(`\n${issue.type.toUpperCase()}: ${issue.file}`);
        console.log(`Message: ${issue.message}`);
        if (issue.line) {
          console.log(`Location: Line ${issue.line}${issue.column ? `, Column ${issue.column}` : ''}`);
        }
      });
    }

    return {
      issues,
      stats: {
        filesChecked,
        issuesFound: issues.length,
        fixesApplied,
        duration
      }
    };

  } catch (error) {
    console.error('❌ Error during code review:', error);
    throw error;
  }
}

// Run the review if called directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  reviewCode()
    .then(result => {
      if (result.issues.length === 0) {
        console.log('\n✅ No issues found!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Issues found. Please review the report above.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Code review failed:', error);
      process.exit(1);
    });
}

export { reviewCode, type ReviewResult, type CodeIssue };
