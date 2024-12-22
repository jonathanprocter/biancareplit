import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure WebSocket for Neon database connection with retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const BACKOFF_FACTOR = 1.5;

const createWebSocketProxy = () => ({
  webSocketConstructor: ws,
  onClose: () => {
    console.info('[Database] WebSocket connection closed, attempting reconnect...');
    setTimeout(initializePool, RETRY_DELAY);
  },
  onError: (err: Error) => {
    console.error('[Database] WebSocket error:', err);
  },
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

let retryCount = 0;
let pool: Pool;

// Initialize pool with retry mechanism and exponential backoff
const initializePool = async () => {
  try {
    if (retryCount >= MAX_RETRIES) {
      console.error('[Database] Max retry attempts reached');
      process.exit(1);
      return;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
      max: 10,
      idleTimeoutMillis: 30000,
      ssl: true,
      wsProxy: createWebSocketProxy(),
    });

    // Test the connection
    await pool.query('SELECT 1');
    console.info('[Database] Connection established successfully');
    retryCount = 0;
  } catch (error) {
    console.error('[Database] Connection attempt failed:', error);
    retryCount++;
    const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCount - 1);
    setTimeout(initializePool, delay);
  }
};

// Initial pool creation
await initializePool();

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
      },
    };
  } catch (error) {
    console.error('[Database] Health check failed:', error);
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// Clean shutdown function
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    console.info('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error('[Database] Error during cleanup:', error);
    throw error;
  }
}

// Graceful shutdown handlers
const cleanup = async (signal: string) => {
  try {
    console.info(`[Database] Received ${signal}, cleaning up...`);
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error(`[Database] ${signal} cleanup failed:`, error);
    process.exit(1);
  }
};

process.on('SIGINT', () => void cleanup('SIGINT'));
process.on('SIGTERM', () => void cleanup('SIGTERM'));
