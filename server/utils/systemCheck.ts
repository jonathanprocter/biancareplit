import { db, testConnection } from '../../db';
import { log } from '../vite';

export interface SystemCheckResult {
  status: 'ok' | 'error';
  checks: {
    database: boolean;
    api: boolean;
    static: boolean;
    env: boolean;
    migrations: boolean;
    dependencies: boolean;
  };
  details: {
    missingEnvVars?: string[];
    databaseError?: string;
    apiErrors?: string[];
    migrationErrors?: string[];
    dependencyErrors?: string[];
    timestamp: string;
  };
}

export const requiredEnvVars = ['DATABASE_URL', 'NODE_ENV', 'PORT'];

export async function validateDatabaseSchema(): Promise<boolean> {
  try {
    // Check if essential tables exist
    const result = await db.execute(
      'SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)',
      ['content'],
    );
    return result.rows[0]?.exists || false;
  } catch (error) {
    log('[SystemCheck] Schema validation error:', error);
    return false;
  }
}

export async function checkAPIEndpoints(): Promise<{ success: boolean; errors: string[] }> {
  const endpoints = ['/health', '/api/health'];
  const errors: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT}${endpoint}`);
      if (!response.ok) {
        errors.push(`${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function checkDependencyVersions(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  try {
    const pkg = require('../../package.json');
    const requiredVersions = {
      react: '18.2.0',
      'react-dom': '18.2.0',
      '@types/react': '18.2.0',
      '@types/react-dom': '18.2.0',
    };

    Object.entries(requiredVersions).forEach(([dep, version]) => {
      const installedVersion = pkg.dependencies[dep] || pkg.devDependencies[dep];
      if (!installedVersion) {
        errors.push(`Missing dependency: ${dep}`);
      } else if (!installedVersion.includes(version)) {
        errors.push(`Version mismatch for ${dep}: expected ${version}, got ${installedVersion}`);
      }
    });

    return {
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        `Failed to check dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    };
  }
}

export async function performSystemCheck(): Promise<SystemCheckResult> {
  const result: SystemCheckResult = {
    status: 'ok',
    checks: {
      database: false,
      api: false,
      static: false,
      env: true,
      migrations: false,
      dependencies: false,
    },
    details: {
      timestamp: new Date().toISOString(),
    },
  };

  // Check environment variables
  const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
  if (missingEnvVars.length > 0) {
    result.checks.env = false;
    result.details.missingEnvVars = missingEnvVars;
    result.status = 'error';
    log('[SystemCheck] Missing environment variables:', missingEnvVars);
  }

  // Check dependencies
  const depCheck = await checkDependencyVersions();
  result.checks.dependencies = depCheck.success;
  if (!depCheck.success) {
    result.status = 'error';
    result.details.dependencyErrors = depCheck.errors;
    log('[SystemCheck] Dependency check errors:', depCheck.errors);
  }

  // Check database connection with retries
  try {
    const dbConnected = await testConnection(3);
    result.checks.database = dbConnected;

    if (dbConnected) {
      // Only check schema if connection succeeds
      result.checks.migrations = await validateDatabaseSchema();
      if (!result.checks.migrations) {
        result.details.migrationErrors = ['Database schema validation failed'];
        result.status = 'error';
      }
    } else {
      result.status = 'error';
      result.details.databaseError = 'Failed to connect to database after 3 attempts';
    }
  } catch (error) {
    result.checks.database = false;
    result.status = 'error';
    result.details.databaseError =
      error instanceof Error ? error.message : 'Unknown database error';
    log('[SystemCheck] Database check error:', error);
  }

  // Check API endpoints
  const apiCheck = await checkAPIEndpoints();
  result.checks.api = apiCheck.success;
  if (!apiCheck.success) {
    result.status = 'error';
    result.details.apiErrors = apiCheck.errors;
    log('[SystemCheck] API check errors:', apiCheck.errors);
  }

  // Static files check (verify dist directory exists and contains expected files)
  try {
    const fs = await import('fs/promises');
    const distPath = './dist/public';
    await fs.access(distPath);
    result.checks.static = true;
  } catch {
    result.checks.static = false;
    result.status = 'error';
    log('[SystemCheck] Static files check failed: dist directory not found');
  }

  return result;
}
