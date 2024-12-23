import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Initialize WebSocket with proper SSL configuration
const wsConstructor = (url: string): WebSocket => {
  const ws = new WebSocket(url, {
    rejectUnauthorized: true, // Enable SSL verification
    headers: {
      'Accept-Encoding': 'gzip, deflate, br',
    },
    handshakeTimeout: 30000, // 30 seconds timeout
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error);
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  ws.on('close', (code, reason) => {
    console.log(`[Database] WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
  });

  return ws;
};

// Create connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  connectionTimeoutMillis: 30000,
  max: 2, // Minimal pool size for better stability
  idleTimeoutMillis: 15000,
  maxUses: 7500,
  retryInterval: 500,
  maxRetries: 3,
});

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Export SQL tag for raw queries
export { sql };

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    console.log('[Database] Testing connection...');
    const result = await db.execute(sql`SELECT 1`);
    console.log('[Database] Connection test successful');
    return true;
  } catch (error) {
    console.error('[Database] Connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
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