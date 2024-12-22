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
    // Use --pretty for better error formatting
    // Use --incremental and --noEmit for faster checks
    const result = await execAsync(`npx tsc --noEmit --pretty --incremental ${files.join(' ')}`);
    console.log('✅ TypeScript check complete');
    return result;
  } catch (error) {
    if (error instanceof Error) {
      // Parse and format TypeScript errors
      const errorLines = error.message.split('\n');
      const formattedErrors = errorLines
        .filter(line => line.includes('.ts') || line.includes('.tsx'))
        .map(line => {
          const matches = line.match(/(.+)\((\d+),(\d+)\): (.+)/);
          if (matches) {
            return {
              file: matches[1].trim(),
              line: parseInt(matches[2]),
              column: parseInt(matches[3]),
              message: matches[4].trim()
            };
          }
          return null;
        })
        .filter(Boolean);

      if (formattedErrors.length > 0) {
        console.error('TypeScript Errors:');
        formattedErrors.forEach(err => {
          if (err) {
            console.error(`${err.file}:${err.line}:${err.column} - ${err.message}`);
          }
        });
      }
    }
    throw error;
  }
}

async function checkAccessibility(files: string[]): Promise<CodeIssue[]> {
  const issues: CodeIssue[] = [];
  console.log('♿ Checking accessibility...');

  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Enhanced accessibility checks
      const checks = [
        {
          pattern: /<img[^>]+(?!alt=)[^>]*>/g,
          message: 'Image missing alt text',
          type: 'error'
        },
        {
          pattern: /<button[^>]+(?!aria-label=)[^>]*>(?!\s*[^<]*[^\s])[^<]*<\/button>/g,
          message: 'Empty button missing aria-label',
          type: 'error'
        },
        {
          pattern: /<div[^>]+(?:onclick|onkeyup|onkeydown|onkeypress)[^>]*(?!role=)[^>]*>/g,
          message: 'Interactive div missing role attribute',
          type: 'warning'
        },
        {
          pattern: /<a[^>]+href="#"[^>]*>/g,
          message: 'Anchor with hash href might cause accessibility issues',
          type: 'warning'
        },
        {
          pattern: /<input[^>]+(?!id=)[^>]*>[\s\S]*?<label[^>]*>/g,
          message: 'Input field missing associated label',
          type: 'error'
        }
      ];

      for (const check of checks) {
        const matches = content.match(check.pattern);
        if (matches) {
          issues.push({
            type: check.type as 'error' | 'warning',
            message: check.message,
            file,
            source: 'accessibility'
          });
        }
      }

      // Check for proper heading hierarchy
      const headings = Array.from(content.matchAll(/<h([1-6])[^>]*>/g));
      if (headings.length > 0) {
        let prevLevel = 0;
        let lineNumber = 1;
        
        for (const heading of headings) {
          // Count lines up to this heading to get line number
          lineNumber += content.slice(0, heading.index).split('\n').length - 1;
          
          const level = parseInt(heading[1]);
          if (prevLevel > 0 && level > prevLevel + 1) {
            issues.push({
              type: 'warning',
              message: `Skipped heading level: h${prevLevel} to h${level}`,
              file,
              line: lineNumber,
              source: 'accessibility'
            });
          }
          prevLevel = level;
        }
      }

      // Check for ARIA attributes
      const ariaChecks = [
        {
          pattern: /aria-[a-z]+=""/g,
          message: 'Empty ARIA attribute',
          type: 'warning'
        },
        {
          pattern: /role="presentation"[\s\S]*?(?:aria-[a-z]+)/g,
          message: 'Presentation role with ARIA attributes',
          type: 'warning'
        }
      ];

      for (const check of ariaChecks) {
        const matches = content.match(check.pattern);
        if (matches) {
          issues.push({
            type: check.type as 'error' | 'warning',
            message: check.message,
            file,
            source: 'accessibility'
          });
        }
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
  const BATCH_SIZE = 20;

  try {
    console.log('\n🔍 Starting Medical Education Platform Code Review');
    console.log('═══════════════════════════════════════════════════\n');

    // Get all TypeScript files
    const files: string[] = [];
    for (const dir of HIGH_PRIORITY_PATHS) {
      try {
        const highPriorityFiles = await getTypeScriptFiles(dir);
        files.push(...highPriorityFiles);
      } catch (error) {
        console.warn(`⚠️ Warning: Could not process high-priority directory ${dir}:`, error);
      }
    }

    for (const dir of CORE_PATHS) {
      if (!HIGH_PRIORITY_PATHS.includes(dir)) {
        try {
          const coreFiles = await getTypeScriptFiles(dir);
          files.push(...coreFiles);
        } catch (error) {
          console.warn(`⚠️ Warning: Could not process core directory ${dir}:`, error);
        }
      }
    }

    filesChecked = files.length;
    console.log(`📁 Found ${filesChecked} files to review\n`);

    // Process files in batches
    const totalBatches = Math.ceil(files.length / BATCH_SIZE);
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const progress = Math.round((batchNumber / totalBatches) * 100);
      
      console.log(`\n📦 Processing Batch ${batchNumber}/${totalBatches} (${progress}% complete)`);
      console.log(`   Processing ${batch.length} files in this batch...`);

      try {
        // Format files in batch
        await formatFiles(batch);
        fixesApplied++;
        
        // Lint files in batch
        await lintFiles(batch);
        fixesApplied++;
        
        // Type check each file individually to avoid terminating on single file error
        for (const file of batch) {
          try {
            await typeCheck([file]);
          } catch (error) {
            issues.push({
              type: 'error',
              message: error instanceof Error ? error.message : String(error),
              file,
              source: 'typescript'
            });
          }
        }

        // Run additional checks
        const accessibilityIssues = await checkAccessibility(batch);
        const securityIssues = await checkSecurityIssues(batch);
        
        issues.push(...accessibilityIssues, ...securityIssues);
      } catch (error) {
        console.error(`❌ Error processing batch ${batchNumber}:`, error);
        // Continue with next batch instead of terminating
      }
    }

    const duration = Date.now() - startTime;

    // Generate detailed report
    console.log('\n📊 Code Review Summary');
    console.log('═══════════════════');
    console.log(`Files checked: ${filesChecked}`);
    console.log(`Issues found: ${issues.length}`);
    console.log(`Fixes applied: ${fixesApplied}`);
    console.log(`Duration: ${duration}ms`);

    if (issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      // Group issues by type
      const groupedIssues = issues.reduce((acc, issue) => {
        const key = issue.type;
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue);
        return acc;
      }, {} as Record<string, CodeIssue[]>);

      // Print issues grouped by type
      Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
        console.log(`\n${type.toUpperCase()} ISSUES (${typeIssues.length}):`);
        typeIssues.forEach(issue => {
          console.log(`\n  File: ${issue.file}`);
          console.log(`  Message: ${issue.message}`);
          if (issue.line) {
            console.log(`  Location: Line ${issue.line}${issue.column ? `, Column ${issue.column}` : ''}`);
          }
          if (issue.source) {
            console.log(`  Source: ${issue.source}`);
          }
        });
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
    return {
      issues: [{
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
        file: 'code-review',
        source: 'system'
      }],
      stats: {
        filesChecked,
        issuesFound: 1,
        fixesApplied,
        duration: Date.now() - startTime
      }
    };
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
