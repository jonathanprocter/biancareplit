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
  const ws = new WebSocket(url, {
    rejectUnauthorized: false, // Required for Neon's self-signed certificates
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
    },
    handshakeTimeout: 30000,
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  ws.on('close', () => {
    console.log('[Database] WebSocket connection closed');
  });

  return ws;
};

// Configure database pool with minimal settings for initial connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  max: 1, // Start with minimum connections
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 10000,
  maxUses: 100,
  retryInterval: 3000,
  maxRetries: 3,
});

// Initialize Drizzle ORM
export const db = drizzle(pool, { schema });

// Test database connection with enhanced logging
export async function testConnection(): Promise<boolean> {
  try {
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
    console.error('[Database] Connection failed:', errorMessage);
    return false;
  }
}

// Cleanup function
async function cleanup(): Promise<void> {
  try {
    console.log('[Database] Initiating cleanup...');
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error('[Database] Cleanup error:', error instanceof Error ? error.message : error);
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Export the Drizzle ORM instance as the default export
export { db as default };