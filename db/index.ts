import * as schema from '@db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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
    rejectUnauthorized: false, // Required for some cloud database providers
  },
  connection_retries: 3, // Number of retries on connection fail
  retry_on: ['ECONNRESET', 'ECONNREFUSED', 'CONNECTION_ENDED'], // Retry on specific errors
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Export the raw client for direct queries when needed
export const rawClient = client;

// Export sql helper for raw queries
export { sql } from 'drizzle-orm';

// Enhanced connection test function with retries
export async function testConnection(retries = 5): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      log('[Database] Connection test successful');
      return true;
    } catch (error) {
      log(`[Database] Connection attempt ${i + 1}/${retries} failed:`, error);
      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff with 5s max
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  try {
    await client.end();
    log('[Database] Connection pool closed successfully');
  } catch (error) {
    if (error instanceof Error) {
      log('[Database] Error:', error.message);
    } else {
      log('[Database] An unknown error occurred:', error);
    }
  }
}

// Register cleanup handlers
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);