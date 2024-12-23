import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Singleton pool and db instances
let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Initialize WebSocket with robust configuration
function createWebSocket(url: string): WebSocket {
  console.log('[Database] Creating WebSocket connection...');
  const wsUrl = url.replace('postgres://', 'wss://').replace('postgresql://', 'wss://');

  const ws = new WebSocket(wsUrl, {
    perMessageDeflate: false,
    skipUTF8Validation: true,
    handshakeTimeout: 30000,
    maxPayload: 100 * 1024 * 1024, // 100MB
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
}

// Initialize database connection with retry mechanism
async function initializeDatabase(retries = 3): Promise<ReturnType<typeof drizzle>> {
  if (!dbInstance) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Database] Initializing connection (attempt ${attempt}/${retries})...`);

        // Configure pool with detailed options
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          webSocketConstructor: createWebSocket,
          max: 1, // Limit connections for serverless environment
          connectionTimeoutMillis: 30000,
          idleTimeoutMillis: 30000,
          maxUses: 5000,
          keepAlive: true,
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
        console.error(
          `[Database] Connection attempt ${attempt} failed:`,
          error instanceof Error ? error.message : 'Unknown error',
        );

        // Cleanup on failure
        if (pool) {
          await pool.end().catch((err) => 
            console.error('[Database] Error while closing pool:', err)
          );
          pool = null;
        }

        if (attempt === retries) {
          throw new Error(`Failed to initialize database after ${retries} attempts`);
        }

        // Wait before next attempt (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Database] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return dbInstance!;
}

// Test database connection
export async function testConnection(retries = 3): Promise<boolean> {
  try {
    const db = await initializeDatabase(retries);
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error(
      '[Database] Connection test failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return false;
  }
}

// Cleanup function
export async function cleanup(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      dbInstance = null;
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
process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);

// Export database instance getter
export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  return initializeDatabase();
}

export { sql };