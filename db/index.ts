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
    rejectUnauthorized: false // Allow self-signed certificates in all environments for Replit
  },
  // Add retry configuration
  connection_retries: 5,
  retry_on: ['ECONNRESET', 'ECONNREFUSED', 'CONNECTION_ENDED', 'ETIMEDOUT']
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Export sql helper for raw queries
export { sql };

// Enhanced connection test function with retries
export async function testConnection(retries = 5): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      log('[Database] Connection test successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`[Database] Connection attempt ${i + 1}/${retries} failed: ${errorMessage}`);

      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff
        log(`[Database] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  log('[Database] All connection attempts failed');
  return false;
}

// Initialize application with proper error handling
export async function initializeDatabase() {
  try {
    const isConnected = await testConnection();
    if (!isConnected && process.env.NODE_ENV === 'production') {
      throw new Error('Database connection required in production');
    }
    if (!isConnected) {
      log('[Database] Warning: Starting in development mode without database connection');
    }
    return isConnected;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('[Database] Initialization error:', errorMessage);
    throw error;
  }
}

// Register cleanup handlers
process.once('SIGINT', async () => {
  try {
    await client.end();
    log('[Database] Connection pool closed successfully');
  } catch (error) {
    log('[Database] Error during cleanup:', error);
  }
});

process.once('SIGTERM', async () => {
  try {
    await client.end();
    log('[Database] Connection pool closed successfully');
  } catch (error) {
    log('[Database] Error during cleanup:', error);
  }
});

// Start initialization
initializeDatabase().catch(error => {
  log('[Database] Fatal error during startup:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});