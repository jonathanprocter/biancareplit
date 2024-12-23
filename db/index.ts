import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

console.log('[Database] Initializing connection pool...');

// Create a basic WebSocket client with fallback options
const wsConstructor = (url: string): WebSocket => {
  const ws = new WebSocket(url, {
    handshakeTimeout: 10000,
    maxPayload: 100 * 1024 * 1024, // 100MB
    perMessageDeflate: true,
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
  });

  return ws;
};

// Enhanced pool configuration with better error handling and WebSocket configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  max: 3, // Further reduced pool size for initial stability
  connectionTimeoutMillis: 15000, // Increased timeout
  idleTimeoutMillis: 30000,
  ssl: true,
  maxUses: 1000, // Reduced for better connection recycling
  retryInterval: 1500, // Increased retry interval
  maxRetries: 5, // Keep max retries
});

export const db = drizzle(pool, { schema });

// Enhanced connection testing with better error handling and retry logic
export async function testConnection(retries = 5, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('[Database] Database connection successful');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[Database] Connection attempt ${attempt}/${retries} failed:`,
        errorMessage,
      );

      if (attempt < retries) {
        console.log(`[Database] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('[Database] All connection attempts failed');
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Failed to establish database connection in production');
        }
        return false;
      }
    }
  }
  return false;
}

// Enhanced cleanup function
async function cleanup(): Promise<void> {
  try {
    console.log('[Database] Attempting to close connection pool...');
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error(
      '[Database] Failed to close connection pool:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export default db;