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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function initializeDatabase() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      if (!pool) {
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
      }

      // Test the connection
      await pool.query('SELECT 1');

      if (!dbInstance) {
        dbInstance = drizzle(pool, { schema });
      }

      console.info('[Database] Successfully connected to database');
      return dbInstance;
    } catch (error) {
      retries++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Database] Connection attempt ${retries} failed: ${errorMessage}`);

      if (pool) {
        await pool.end().catch(console.error);
        pool = null;
        dbInstance = null;
      }

      if (retries === MAX_RETRIES) {
        throw new Error(`Failed to initialize database after ${MAX_RETRIES} attempts: ${errorMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries)));
    }
  }

  throw new Error('Failed to initialize database after multiple attempts');
}

export async function checkDatabaseHealth() {
  try {
    if (!pool) {
      return {
        healthy: false,
        error: 'Database pool not initialized',
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();
    const result = await pool.query('SELECT 1');
    const duration = Date.now() - startTime;

    return {
      healthy: result.rows.length > 0,
      timestamp: new Date().toISOString(),
      responseTime: duration,
      poolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Database] Health check failed:', errorMessage);
    return {
      healthy: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function closeDatabase() {
  if (!pool) return;

  try {
    await pool.end();
    console.info('[Database] Connection pool closed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Database] Error during cleanup:', errorMessage);
    throw error;
  }
}

// Initialize the database and export the instance
let db: ReturnType<typeof drizzle>;

// Initialize database connection
initializeDatabase()
  .then((instance) => {
    db = instance;
  })
  .catch((error) => {
    console.error('[Database] Failed to initialize:', error);
    process.exit(1);
  });

// Handle cleanup on process termination
process.on('SIGINT', async () => {
  try {
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(
      '[Database] Failed to close database:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(
      '[Database] Failed to close database:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
});

export { db };
