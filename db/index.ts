import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

// Configure Neon database settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

async function initializeDatabase() {
  try {
    // Return existing instance if already initialized
    if (dbInstance && pool) {
      return dbInstance;
    }

    // Create new pool if needed
    if (!pool) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    // Test connection
    await pool.query('SELECT 1');

    // Create Drizzle instance
    dbInstance = drizzle(pool, { schema });
    console.info('[Database] Successfully connected to database');
    return dbInstance;
  } catch (error) {
    console.error(
      '[Database] Connection failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    // Cleanup on failure
    if (pool) {
      await pool
        .end()
        .catch((err) =>
          console.error('[Database] Error closing pool:', err instanceof Error ? err.message : err),
        );
      pool = null;
    }
    dbInstance = null;

    throw error;
  }
}

async function closeDatabase() {
  try {
    if (pool) {
      await pool.end();
      console.info('[Database] Connection pool closed successfully');
    }
  } catch (error) {
    console.error(
      '[Database] Failed to close database:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }

  pool = null;
  dbInstance = null;
}

// Handle cleanup on process termination
process.on('SIGINT', () => {
  closeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(
        '[Database] Failed to close database:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      process.exit(1);
    });
});

process.on('SIGTERM', () => {
  closeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(
        '[Database] Failed to close database:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      process.exit(1);
    });
});

// Export the database initialization function
export const db = initializeDatabase;
