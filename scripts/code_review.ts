import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const CORE_PATHS = [
  'src',
  'server',
  'client',
  'db',
];

// Prioritize these paths for initial review
const HIGH_PRIORITY_PATHS = [
  'src/components',
  'server/services',
  'server/routes.ts',
  'db/schema.ts',
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
    // Run ESLint in report mode
    const { stdout: lintOutput } = await execAsync(
      `npx eslint ${files.join(' ')} --format stylish`
    );
    
    // Count remaining issues
    const issueCount = (lintOutput.match(/problem/g) || []).length;
    
    console.log('\nLinting Issues Found:', issueCount);
    if (issueCount > 0) {
      console.log('\nDetailed ESLint Report:');
      console.log(lintOutput);
    }
    
    // File statistics
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

    // Process high priority files in smaller batches
    const HIGH_PRIORITY_BATCH_SIZE = 10;
    if (highPriorityFiles.length > 0) {
      console.log('\nProcessing high priority files...');
      for (let i = 0; i < highPriorityFiles.length; i += HIGH_PRIORITY_BATCH_SIZE) {
        const batch = highPriorityFiles.slice(i, i + HIGH_PRIORITY_BATCH_SIZE);
        console.log(`\nProcessing high priority batch ${Math.floor(i / HIGH_PRIORITY_BATCH_SIZE) + 1}...`);
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
    
    // Process remaining files in larger batches
    const BATCH_SIZE = 20;
    if (remainingFiles.length > 0) {
      console.log('\nProcessing remaining files...');
      for (let i = 0; i < remainingFiles.length; i += BATCH_SIZE) {
        const batch = remainingFiles.slice(i, i + BATCH_SIZE);
        console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
        await formatFiles(batch);
        await lintFiles(batch);
      }
    }
    
    // Generate report for all files
    const allFiles = [...highPriorityFiles, ...remainingFiles];
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
