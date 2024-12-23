import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Initialize WebSocket with robust configuration
const wsConstructor = (url: string): WebSocket => {
  const sanitizedUrl = url.replace(/\/\/.*@/, '//***@');
  console.log('[Database] Initializing WebSocket connection...', sanitizedUrl);

  const ws = new WebSocket(url, {
    rejectUnauthorized: false,
    perMessageDeflate: false,
    skipUTF8Validation: true,
    handshakeTimeout: 30000,
    maxPayload: 100 * 1024 * 1024,
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

// Create a pool factory with improved configuration
const createPool = () => {
  console.log('[Database] Creating new connection pool...');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    webSocketConstructor: wsConstructor,
    max: 1,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    maxUses: 5000,
    keepAlive: true,
  });
};

// Initialize pool
let pool = createPool();

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Export SQL tag for raw queries
export { sql };

// Test database connection with exponential backoff
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Database] Testing connection (attempt ${i + 1}/${retries})...`);
      await db.execute(sql`SELECT 1`);
      console.log('[Database] Connection test successful');
      return true;
    } catch (error) {
      console.error(
        `[Database] Connection test failed (attempt ${i + 1}/${retries}):`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (error instanceof Error) {
        if (error.message.includes('after calling end on the pool')) {
          console.log('[Database] Pool ended, recreating...');
          pool = createPool();
          db.execute = (query: any) => drizzle(pool, { schema }).execute(query);
        }
      }

      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`[Database] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Cleanup function with improved error handling
export async function cleanup(): Promise<void> {
  try {
    if (pool) {
      console.log('[Database] Closing existing pool...');
      await pool.end();
      pool = createPool();
      console.log('[Database] Connection pool closed and recreated successfully');
    }
  } catch (error) {
    console.error(
      '[Database] Cleanup error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
