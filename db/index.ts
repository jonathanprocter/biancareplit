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
    handshakeTimeout: 30000, // Increased timeout for better reliability
  });

  // Enhanced error handling and logging
  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
    console.error('[Database] Error details:', error);
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
  connectionTimeoutMillis: 30000, // Increased timeout
  max: 10, // Increased max connections for better performance
  idleTimeoutMillis: 120000, // Increased idle timeout
  maxUses: 7500, // Connections will be cycled after this many uses
  retryInterval: 1000, // More frequent retries
  maxRetries: 5, // Increased retry attempts
});

// Initialize Drizzle ORM with enhanced error handling
export const db = drizzle(pool, { schema });

// Improved connection testing with detailed error reporting
export async function testConnection(): Promise<boolean> {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Database] Connection test failed:', errorMessage);
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

// Export pool for direct access if needed
export { pool };