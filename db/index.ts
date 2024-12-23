import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Initialize WebSocket with robust configuration
const wsConstructor = (url: string): WebSocket => {
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

  return ws;
};

// Initialize pool and database connection
const initializeDatabase = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      webSocketConstructor: wsConstructor,
      max: 1,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      maxUses: 5000,
      keepAlive: true,
    });
    db = drizzle(pool, { schema });
  }
  return db;
};

// Get database instance, creating if necessary
export const getDb = () => {
  if (!db) {
    return initializeDatabase();
  }
  return db;
};

// Test database connection with exponential backoff
export async function testConnection(retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Database] Testing connection (attempt ${i + 1}/${retries})...`);
      const currentDb = getDb();
      await currentDb.execute(sql`SELECT 1`);
      console.log('[Database] Connection test successful');
      return true;
    } catch (error) {
      console.error(
        `[Database] Connection test failed (attempt ${i + 1}/${retries}):`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        console.log(`[Database] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Cleanup function
export async function cleanup(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      db = null;
      console.log('[Database] Connection pool closed successfully');
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

// Export database instance and SQL tag
export const database = getDb();
export { sql };