import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
  duration?: number;
}

interface PackageVersions {
  [key: string]: string;
}

const REQUIRED_FILES = [
  'dist/index.js',
  'dist/public',
  '.env',
  'db/schema.ts',
  'client/src/App.tsx'
];

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT'
];

const CRITICAL_PACKAGES: PackageVersions = {
  'react': '18.2.0',
  '@tanstack/react-query': '^5.0.0',
  'drizzle-orm': '^0.29.0',
};

async function checkPackageVersions(): Promise<CheckResult> {
  const start = performance.now();
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const mismatches: string[] = [];

    Object.entries(CRITICAL_PACKAGES).forEach(([pkg, version]) => {
      const installedVersion = packageJson.dependencies[pkg];
      if (!installedVersion) {
        mismatches.push(`${pkg} is missing`);
      } else if (!installedVersion.includes(version.replace('^', ''))) {
        mismatches.push(`${pkg}: expected ${version}, found ${installedVersion}`);
      }
    });

    return {
      passed: mismatches.length === 0,
      message: mismatches.length === 0 ? 'Package versions check passed' : 'Package version mismatch',
      details: mismatches.join('\n'),
      duration: performance.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Failed to check package versions',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - start
    };
  }
}

async function checkBuild(): Promise<CheckResult> {
  const start = performance.now();
  try {
    execSync('npm run build', { stdio: 'pipe' });
    
    // Verify build output
    const buildFiles = REQUIRED_FILES.filter(file => 
      file.startsWith('dist/') && !fs.existsSync(path.resolve(file))
    );
    
    return {
      passed: buildFiles.length === 0,
      message: buildFiles.length === 0 ? 'Build completed successfully' : 'Build verification failed',
      details: buildFiles.length > 0 ? `Missing build files: ${buildFiles.join(', ')}` : undefined,
      duration: performance.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Build failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - start
    };
  }
}

async function checkTypeScript(): Promise<CheckResult> {
  const start = performance.now();
  try {
    execSync('npm run check', { stdio: 'pipe' });
    return {
      passed: true,
      message: 'TypeScript checks passed',
      duration: performance.now() - start
    };
  } catch (error) {
    return {
      passed: false,
      message: 'TypeScript checks failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: performance.now() - start
    };
  }
}

async function checkRequiredFiles(): Promise<CheckResult> {
  const start = performance.now();
  const missingFiles = REQUIRED_FILES.filter(file => !fs.existsSync(path.resolve(file)));
  
  return {
    passed: missingFiles.length === 0,
    message: missingFiles.length === 0 ? 'All required files present' : 'Missing required files',
    details: missingFiles.length > 0 ? `Missing files: ${missingFiles.join(', ')}` : undefined,
    duration: performance.now() - start
  };
}

async function checkEnvironmentVariables(): Promise<CheckResult> {
  const start = performance.now();
  const missingVars = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);

  return {
    passed: missingVars.length === 0,
    message: missingVars.length === 0 ? 'Environment variables check passed' : 'Missing environment variables',
    details: missingVars.length > 0 ? `Missing variables: ${missingVars.join(', ')}` : undefined,
    duration: performance.now() - start
  };
}

async function main() {
  console.log('Running pre-deployment checks...\n');
  
  const checks = [
    { name: 'Package Versions', fn: checkPackageVersions },
    { name: 'Required Files', fn: checkRequiredFiles },
    { name: 'Environment Variables', fn: checkEnvironmentVariables },
    { name: 'TypeScript', fn: checkTypeScript },
    { name: 'Build', fn: checkBuild },
  ];
  
  const results = await Promise.all(checks.map(async check => ({
    name: check.name,
    result: await check.fn()
  })));
  
  const failed = results.filter(r => !r.result.passed);
  
  console.log('\nCheck Results:');
  results.forEach(({ name, result }) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = result.result.duration ? ` (${result.result.duration.toFixed(0)}ms)` : '';
    console.log(`${icon} ${name}${duration}`);
    if (result.result.details) {
      console.log(`   └─ ${result.result.details}`);
    }
  });
  
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed`);
  
  if (failed.length > 0) {
    console.log('\nFailed checks:');
    failed.forEach(({ name, result }) => {
      console.log(`❌ ${name}`);
      if (result.result.details) {
        console.log(`   └─ ${result.result.details}`);
      }
    });
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Pre-deployment check failed:', error);
  process.exit(1);
});
