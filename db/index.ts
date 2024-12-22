import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure WebSocket for Neon database connection
const wsProxy = {
  webSocketConstructor: ws,
  onClose: () => console.log('[Database] WebSocket connection closed'),
  onError: (err: Error) => console.error('[Database] WebSocket error:', err),
};

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: true,
});

// Initialize Drizzle ORM
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
      }
    };
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

// Clean shutdown function
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error('[Database] Error during cleanup:', error);
    throw error;
  }
}

// Graceful shutdown handlers
const cleanup = async (signal: string) => {
  try {
    console.log(`[Database] Received ${signal}, cleaning up...`);
    await closeDatabase();
  } catch (error) {
    console.error(`[Database] ${signal} cleanup failed:`, error);
    process.exit(1);
  }
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));