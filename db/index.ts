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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Health check function
export async function checkDatabaseHealth() {
  try {
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
    console.error(
      '[Database] Health check failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// Cleanup function
export async function closeDatabase() {
  try {
    await pool.end();
    console.info('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error(
      '[Database] Error during cleanup:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    throw error;
  }
}

// Handle cleanup on process termination
process.on('SIGINT', () => {
  closeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});

process.on('SIGTERM', () => {
  closeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
