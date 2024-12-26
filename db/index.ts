import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client with proper SSL configuration
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: {
    rejectUnauthorized: false,
  },
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connection_timeout: 30,
});

// Initialize database with drizzle
export const db = drizzle(client, { schema });

// Test database connection and initialize
export async function initializeDatabase() {
  try {
    await db.execute(sql`SELECT NOW()`);
    console.log('[Database] Connection established successfully');
    return true;
  } catch (error) {
    console.error(
      '[Database] Failed to connect:',
      error instanceof Error ? error.message : String(error)
    );

    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return false;
  }
}

// Cleanup handlers
process.once('SIGINT', () => client.end());
process.once('SIGTERM', () => client.end());

// Initialize on import
initializeDatabase().catch((error) => {
  console.error('[Database] Fatal initialization error:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export { sql };