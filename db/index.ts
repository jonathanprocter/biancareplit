import * as schema from '@db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { log } from '../server/vite';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Create a postgres client with enhanced error handling and retry logic
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Reduce max connections for development
  idle_timeout: 20, // Max seconds to keep unused connections
  connect_timeout: 20, // Increase connection timeout
  max_lifetime: 60 * 30, // Connection lifetime in seconds
  connection: {
    application_name: 'medical-education-platform',
  },
  debug: process.env.NODE_ENV === 'development',
  onnotice: (notice) => {
    log('[Database] Notice:', notice.message);
  },
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
  connection_retries: 5,
  retry_on: ['ECONNRESET', 'ECONNREFUSED', 'CONNECTION_ENDED', 'ETIMEDOUT'],
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Export the raw client for direct queries when needed
export const rawClient = client;

// Export sql helper for raw queries
export { sql };

// Enhanced connection test function with retries and detailed logging
export async function testConnection(retries = 5): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await client.query(sql`SELECT 1`);
      log('[Database] Connection test successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[Database] Connection attempt ${i + 1}/${retries} failed: ${errorMessage}`);

      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        log(`[Database] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  log('[Database] All connection attempts failed');
  return false;
}

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  try {
    await client.end();
    log('[Database] Connection pool closed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('[Database] Error during cleanup:', errorMessage);
  }
}

// Register cleanup handlers
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

// Verify connection on startup with proper error handling
testConnection()
  .then((connected) => {
    if (!connected && process.env.NODE_ENV === 'production') {
      log('[Database] Fatal: Could not establish database connection in production');
      process.exit(1);
    } else if (!connected) {
      log('[Database] Warning: Could not establish database connection in development');
    }
  })
  .catch((error) => {
    log('[Database] Unexpected error during initial connection test:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });