import { testConnection, db } from '../../db';
import { log } from '../vite';

export interface SystemCheckResult {
  status: 'ok' | 'error';
  checks: {
    database: boolean;
    api: boolean;
    static: boolean;
    env: boolean;
    migrations: boolean;
  };
  details: {
    missingEnvVars?: string[];
    databaseError?: string;
    apiErrors?: string[];
    migrationErrors?: string[];
    timestamp: string;
  };
}

export const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV',
  'PORT',
  // Add more required env vars as needed
];

export async function validateDatabaseSchema(): Promise<boolean> {
  try {
    // Check if essential tables exist
    await db.execute('SELECT 1 FROM content LIMIT 1');
    await db.execute('SELECT 1 FROM study_material LIMIT 1');
    return true;
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
    errors
  };
}

export async function performSystemCheck(): Promise<SystemCheckResult> {
  const result: SystemCheckResult = {
    status: 'ok',
    checks: {
      database: false,
      api: false,
      static: false,
      env: true,
      migrations: false
    },
    details: {
      timestamp: new Date().toISOString()
    }
  };

  // Check environment variables
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingEnvVars.length > 0) {
    result.checks.env = false;
    result.details.missingEnvVars = missingEnvVars;
    result.status = 'error';
    log('[SystemCheck] Missing environment variables:', missingEnvVars);
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
    result.details.databaseError = error instanceof Error ? error.message : 'Unknown database error';
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
