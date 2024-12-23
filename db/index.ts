import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

console.log('[Database] Initializing connection pool...');

// Initialize WebSocket with proper SSL configuration
const wsConstructor = (url: string): WebSocket => {
  console.log('[Database] Setting up WebSocket connection...');

  const ws = new WebSocket(url, {
    rejectUnauthorized: false, // Required for Neon's self-signed certificates
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
    },
    handshakeTimeout: 60000, // Increased timeout for better reliability
  });

  // Enhanced error handling and logging
  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
    if (error.stack) {
      console.error('[Database] Stack trace:', error.stack);
    }
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established successfully');
  });

  ws.on('close', (code, reason) => {
    console.log(`[Database] WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
  });

  return ws;
};

// Configure database pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  connectionTimeoutMillis: 60000, // Increased timeout
  max: 5, // Reduced max connections for stability
  idleTimeoutMillis: 30000, // Reduced idle timeout
  maxUses: 5000, // Reduced connection reuse
  retryInterval: 100, // Faster retries
  maxRetries: 5,
});

// Initialize Drizzle ORM with enhanced error handling
const db = drizzle(pool, { schema });

// Improved connection testing with detailed error reporting
async function testConnection(): Promise<boolean> {
  console.log('[Database] Testing database connection...');

  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('[Database] Database connection test successful');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      '[Database] Connection test failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    if (error instanceof Error && error.stack) {
      console.error('[Database] Stack trace:', error.stack);
    }
    return false;
  }
}

// Enhanced cleanup function with proper error handling
async function cleanup(): Promise<void> {
  console.log('[Database] Initiating cleanup...');
  try {
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error('[Database] Cleanup error:', error instanceof Error ? error.message : error);
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Export necessary components
export { db, pool, testConnection, cleanup };