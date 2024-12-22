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
  IDLE_TIMEOUT: 30000
};

// Initialize state
let pool: Pool | null = null;
let retryCount = 0;
let isConnecting = false;
let db: ReturnType<typeof drizzle> | undefined;

// Convert postgres:// to postgresql://
function normalizeDbUrl(url: string): string {
  return url.replace(/^postgres:\/\//, 'postgresql://');
}

// Create WebSocket proxy with enhanced error handling
const createWebSocketProxy = () => {
  const proxy = {
    webSocketConstructor: ws,
    onClose: async (event: { code: number; reason: string }) => {
      console.info(`[Database] WebSocket closed (${event.code}): ${event.reason}`);
      if (!isConnecting && pool) {
        await reconnect();
      }
    },
    onError: (err: Error) => {
      console.error('[Database] WebSocket error:', err);
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
    }
  };

  return proxy;
};

// Initialize database pool with retry mechanism
async function initializePool(): Promise<void> {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (retryCount >= DB_CONFIG.MAX_RETRIES) {
      console.error('[Database] Max retry attempts reached');
      process.exit(1);
    }

    const delay = DB_CONFIG.INITIAL_RETRY_DELAY * Math.pow(DB_CONFIG.BACKOFF_FACTOR, retryCount);
    if (retryCount > 0) {
      console.info(`[Database] Attempting reconnection in ${delay}ms (attempt ${retryCount + 1}/${DB_CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const dbUrl = normalizeDbUrl(process.env.DATABASE_URL);

    // Parse and validate the database URL
    try {
      new URL(dbUrl);
    } catch (e) {
      throw new Error('Invalid DATABASE_URL format');
    }

    // Configure pool with optimized settings for Neon
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

    // Test the connection with a timeout
    const connectionTest = Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), DB_CONFIG.CONNECTION_TIMEOUT)
      )
    ]);

    await connectionTest;

    // Verify connection
    await pool.query('SELECT 1');
    console.info('[Database] Connection established successfully');
    retryCount = 0;

    // Initialize Drizzle ORM
    db = drizzle(pool, { schema });
  } catch (error) {
    console.error('[Database] Connection attempt failed:', error);
    retryCount++;
    pool = null;
    await initializePool();
  } finally {
    isConnecting = false;
  }
}

// Reconnection handler
async function reconnect(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.error('[Database] Error closing pool during reconnect:', error);
    }
    pool = null;
  }
  await initializePool();
}

// Health check function
export async function checkDatabaseHealth() {
  if (!pool) {
    return {
      healthy: false,
      error: 'Database pool not initialized',
      timestamp: new Date().toISOString()
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

// Initialize the database connection
await initializePool();

// Export the initialized database instance
export { db };

// Cleanup function
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      console.info('[Database] Connection pool closed successfully');
    } catch (error) {
      console.error('[Database] Error during cleanup:', error);
      throw error;
    }
  }
}

// Register cleanup handlers
process.on('SIGINT', () => void closeDatabase());
process.on('SIGTERM', () => void closeDatabase());
