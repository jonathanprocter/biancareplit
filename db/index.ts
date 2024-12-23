import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

// Check and format database URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Singleton pool and db instances
let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Initialize WebSocket with robust configuration
function createWebSocket(url: string): WebSocket {
  const wsUrl = url.replace(/^postgres:\/\//, 'wss://').replace(/^postgresql:\/\//, 'wss://').split('?')[0];
  console.log('[Database] Creating WebSocket connection to:', wsUrl.replace(/:[^:]*@/, ':****@'));

  const ws = new WebSocket(wsUrl, {
    perMessageDeflate: false,
    skipUTF8Validation: true,
    handshakeTimeout: 30000,
    maxPayload: 100 * 1024 * 1024,
    headers: {
      'User-Agent': 'neon-serverless',
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Protocol': 'neon'
    }
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error instanceof Error ? error.message : String(error));
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  ws.on('close', (code, reason) => {
    console.log('[Database] WebSocket connection closed:', code, reason.toString());
  });

  ws.on('ping', () => {
    try {
      ws.pong();
    } catch (error) {
      console.error('[Database] Error sending pong:', error instanceof Error ? error.message : String(error));
    }
  });

  return ws;
}

// Initialize database connection with enhanced retry mechanism
async function initializeDatabase(retries = 3): Promise<ReturnType<typeof drizzle>> {
  if (!dbInstance) {
    let lastError: Error | null = null;
    let attempt = 1;

    while (attempt <= retries) {
      try {
        console.log(`[Database] Initializing connection (attempt ${attempt}/${retries})...`);

        // Cleanup previous pool if it exists
        if (pool) {
          await pool.end().catch(console.error);
          pool = null;
        }

        pool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          max: 1,
          webSocketConstructor: createWebSocket
        });

        // Test the connection
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
          console.log('[Database] Connection test successful');
        } finally {
          client.release();
        }

        dbInstance = drizzle(pool, { schema });
        console.log('[Database] Connection initialized successfully');
        return dbInstance;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[Database] Connection attempt ${attempt} failed:`, lastError.message);

        // Cleanup on failure
        if (pool) {
          await pool.end().catch(console.error);
          pool = null;
        }

        if (attempt === retries) {
          console.error('[Database] All connection attempts failed');
          throw lastError;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        console.log(`[Database] Waiting ${Math.round(delay)}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }
  }
  return dbInstance!;
}

// Get database instance with connection verification
export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  try {
    if (!dbInstance) {
      return initializeDatabase();
    }
    await dbInstance.execute(sql`SELECT 1`);
    return dbInstance;
  } catch (error) {
    console.error('[Database] Connection verification failed:', error instanceof Error ? error.message : String(error));
    return initializeDatabase();
  }
}

// Enhanced cleanup function
export async function cleanup(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      dbInstance = null;
      console.log('[Database] Connection pool closed successfully');
    }
  } catch (error) {
    console.error('[Database] Cleanup error:', error instanceof Error ? error.message : String(error));
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error('[Database] Connection test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Register cleanup handlers
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

export { sql };