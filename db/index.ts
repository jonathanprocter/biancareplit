import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

// Configure Neon database settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

// Database configuration constants
const DB_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 2000,
  BACKOFF_FACTOR: 1.5,
  CONNECTION_TIMEOUT: 10000,
  MAX_POOL_SIZE: 10,
  IDLE_TIMEOUT: 30000,
};

// Initialize state
let pool: Pool | null = null;
let retryCount = 0;
let isConnecting = false;

// Convert postgres:// to postgresql://
function normalizeDbUrl(url: string): string {
  return url.replace(/^postgres:\/\//, 'postgresql://');
}

// Create WebSocket proxy with enhanced error handling
const createWebSocketProxy = () => ({
  webSocketConstructor: ws,
  onClose: async (event: { code: number; reason: string }) => {
    console.info(`[Database] WebSocket closed (${event.code}): ${event.reason}`);
    if (!isConnecting && pool) {
      await reconnect();
    }
  },
  onError: (err: Error) => {
    console.error('[Database] WebSocket error:', err.message);
    if (!isConnecting && pool) {
      void reconnect();
    }
  },
  onOpen: () => {
    console.info('[Database] WebSocket connection established');
  },
  onMessage: (data: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Database] WebSocket message:', data);
    }
  },
});

// Initialize database pool with retry mechanism
async function initializePool() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (retryCount >= DB_CONFIG.MAX_RETRIES) {
      console.error('[Database] Max retry attempts reached');
      process.exit(1);
    }

    const delay = DB_CONFIG.INITIAL_RETRY_DELAY * Math.pow(DB_CONFIG.BACKOFF_FACTOR, retryCount);
    if (retryCount > 0) {
      console.info(
        `[Database] Attempting reconnection in ${delay}ms (attempt ${retryCount + 1}/${
          DB_CONFIG.MAX_RETRIES
        })`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const dbUrl = normalizeDbUrl(process.env.DATABASE_URL);

    try {
      new URL(dbUrl);
    } catch (e) {
      throw new Error('Invalid DATABASE_URL format');
    }

    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT,
      max: DB_CONFIG.MAX_POOL_SIZE,
      idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT,
      ssl: true,
      wsProxy: {
        ...createWebSocketProxy(),
        connect: {
          timeout: DB_CONFIG.CONNECTION_TIMEOUT,
        },
      },
    });

    const connectionTest = Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), DB_CONFIG.CONNECTION_TIMEOUT),
      ),
    ]);

    await connectionTest;
    console.info('[Database] Connection established successfully');
    retryCount = 0;

    return drizzle(pool, { schema });
  } catch (error) {
    console.error(
      '[Database] Connection attempt failed:',
      error instanceof Error ? error.message : error,
    );
    retryCount++;
    pool = null;
    throw error;
  } finally {
    isConnecting = false;
  }
}

// Reconnection handler
async function reconnect() {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.error(
        '[Database] Error closing pool during reconnect:',
        error instanceof Error ? error.message : error,
      );
    }
    pool = null;
  }
  return initializePool();
}

// Health check function
async function checkDatabaseHealth() {
  if (!pool) {
    return {
      healthy: false,
      error: 'Database pool not initialized',
      timestamp: new Date().toISOString(),
    };
  }

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
      error instanceof Error ? error.message : error,
    );
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// Cleanup function
async function closeDatabase() {
  if (pool) {
    try {
      await pool.end();
      console.info('[Database] Connection pool closed successfully');
    } catch (error) {
      console.error(
        '[Database] Error during cleanup:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}

// Initialize the database connection
const db = await initializePool();

// Register cleanup handlers
process.on('SIGINT', () => void closeDatabase());
process.on('SIGTERM', () => void closeDatabase());

// Export database instance and utilities
export type { Pool };
export { db, checkDatabaseHealth, closeDatabase };
