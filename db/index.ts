import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

// Custom error types for better error handling
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Connection configuration with retry logic
const CONNECTION_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 10000,
};

// Validate environment configuration
if (!process.env.DATABASE_URL) {
  throw new DatabaseError('DATABASE_URL environment variable is required', 'CONFIG_ERROR');
}

// Initialize WebSocket proxy with retry mechanism
const wsProxy = {
  webSocketFactory: async (url: string) => {
    let lastError;
    for (let attempt = 1; attempt <= CONNECTION_CONFIG.maxRetries; attempt++) {
      try {
        console.log(
          `[Database] WebSocket connection attempt ${attempt}/${CONNECTION_CONFIG.maxRetries}`,
        );
        const wsClient = new ws(url, {
          headers: {
            Authorization: `Basic ${Buffer.from(
              process.env.DATABASE_URL?.split('@')[0].split('//')[1] || '',
            ).toString('base64')}`,
          },
          handshakeTimeout: CONNECTION_CONFIG.connectionTimeout,
        });

        // Set up event handlers
        wsClient.on('error', (error) => {
          console.error('[Database] WebSocket error:', error);
        });

        wsClient.on('close', () => {
          console.log('[Database] WebSocket connection closed');
        });

        wsClient.on('open', () => {
          console.log('[Database] WebSocket connection established');
        });

        return wsClient;
      } catch (error) {
        lastError = error;
        if (attempt < CONNECTION_CONFIG.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, CONNECTION_CONFIG.retryDelay));
        }
      }
    }
    throw lastError;
  },
  keepalive: true,
  keepaliveInterval: 10000,
};

// Initialize pool with optimized configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: CONNECTION_CONFIG.connectionTimeout,
  max: 10,
  idleTimeoutMillis: 30000,
  maxUses: 7500,
  maxLifetimeSeconds: 3600,
  maxRetries: CONNECTION_CONFIG.maxRetries,
  retryDelay: CONNECTION_CONFIG.retryDelay,
  wsProxy,
});

// Initialize Drizzle with enhanced error handling
export const db = drizzle(pool, {
  schema,
  logger: true,
});

// Enhanced health check function with connection verification
export async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT 1');
    const duration = Date.now() - startTime;

    const status = {
      healthy: result.rows.length > 0,
      timestamp: new Date().toISOString(),
      responseTime: duration,
      connectionPoolStats: {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      },
    };

    console.log('[Database] Health check passed:', status);
    return status;
  } catch (error) {
    const status = {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      details: error instanceof Error ? error.stack : undefined,
    };
    console.error('[Database] Health check failed:', status);
    return status;
  }
}

// Enhanced database cleanup with graceful shutdown
export async function closeDatabase(): Promise<void> {
  try {
    console.log('[Database] Initiating graceful shutdown...');

    // Set a timeout for the shutdown process
    const shutdownTimeout = setTimeout(() => {
      console.error('[Database] Shutdown timed out after 5 seconds');
      process.exit(1);
    }, 5000);

    await pool.end();
    clearTimeout(shutdownTimeout);

    console.log('[Database] Database connections closed successfully');
  } catch (error) {
    console.error('[Database] Error during cleanup:', error);
    throw error;
  }
}

// Setup cleanup handlers with enhanced error handling
process.on('SIGINT', async () => {
  try {
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error('[Database] Error during SIGINT cleanup:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  try {
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error('[Database] Error during SIGTERM cleanup:', error);
    process.exit(1);
  }
});

process.on('beforeExit', async () => {
  try {
    await closeDatabase();
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error('[Database] Error during beforeExit cleanup:', error);
    process.exit(1);
  }
});
