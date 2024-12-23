import * as schema from '@db/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Create a postgres client with some default settings
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Max number of connections
  idle_timeout: 20, // Max seconds to keep unused connections
  connect_timeout: 10, // Max seconds to wait for connection
  prepare: false, // Disable prepared statements for better compatibility
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  try {
    await client.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error(
      '[Database] Cleanup error:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

// Register cleanup handlers
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

// Export sql helper
export { sql };
