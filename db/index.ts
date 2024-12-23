import * as schema from '@db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Create a postgres client with some default settings
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Reduce max connections for development
  idle_timeout: 20, // Max seconds to keep unused connections
  connect_timeout: 10, // Max seconds to wait for connection
  connection: {
    application_name: 'medical-education-platform',
  },
  types: {
    // Add custom type parsers if needed
  },
  debug: process.env.NODE_ENV === 'development',
  onnotice: (notice) => {
    console.log('[Database] Notice:', notice.message);
  },
  onparameter: (parameterStatus) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Database] Parameter:', parameterStatus.parameter, parameterStatus.value);
    }
  },
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Export the raw client for direct queries when needed
export const rawClient = client;

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  try {
    await client.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error('[Database] Error:', error.message);
    } else {
      console.error('[Database] An unknown error occurred:', error);
    }
  }
}

// Verify database connection
export async function verifyConnection(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('[Database] Connection verification failed:', error);
    return false;
  }
}

// Register cleanup handlers
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

// Export sql helper
export { sql };