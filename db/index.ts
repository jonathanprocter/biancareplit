import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Initialize WebSocket with robust configuration
const wsConstructor = (url: string): WebSocket => {
  console.log('[Database] Initializing WebSocket connection...');

  const ws = new WebSocket(url, {
    rejectUnauthorized: false,
    handshakeTimeout: 30000,
    followRedirects: true,
    headers: {
      'User-Agent': 'drizzle-orm-neon',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Version': '13',
    },
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  ws.on('close', (code, reason) => {
    console.log('[Database] WebSocket connection closed:', code, reason.toString());
  });

  ws.on('ping', () => {
    ws.pong();
  });

  return ws;
};

// Create connection pool with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  max: 1, // Single connection for development
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000
});

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Export SQL tag for raw queries
export { sql };

// Test database connection with exponential backoff
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Database] Testing connection (attempt ${i + 1}/${retries})...`);
      const result = await db.execute(sql`SELECT NOW()`);
      console.log('[Database] Connection test successful:', result);
      return true;
    } catch (error) {
      console.error(
        `[Database] Connection test failed (attempt ${i + 1}/${retries}):`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000); // Exponential backoff with max 10s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Cleanup function
export async function cleanup(): Promise<void> {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error(
      '[Database] Cleanup error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);