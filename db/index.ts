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
  try {
    console.log('[Database] Creating WebSocket connection...');

    // Parse database URL to WebSocket URL
    const wsUrl = url
      .replace(/^postgres:\/\//, 'wss://')
      .replace(/^postgresql:\/\//, 'wss://')
      .split('?')[0];

    // Log sanitized URL for debugging
    const sanitizedUrl = wsUrl.replace(/:[^:]*@/, ':****@');
    console.log('[Database] WebSocket URL:', sanitizedUrl);

    const ws = new WebSocket(wsUrl, {
      perMessageDeflate: false,
      skipUTF8Validation: true,
      handshakeTimeout: 60000, // 60 seconds
      maxPayload: 100 * 1024 * 1024, // 100MB
      headers: {
        'User-Agent': 'neon-serverless',
        'Upgrade': 'websocket',
        'Connection': 'Upgrade'
      },
      rejectUnauthorized: false // Allow self-signed certificates in development
    });

    // Enhanced error handling
    ws.on('error', (error) => {
      console.error('[Database] WebSocket error:', error instanceof Error ? error.message : String(error));
      console.error('[Database] Error details:', error);
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
  } catch (error) {
    console.error('[Database] Error creating WebSocket:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Initialize database connection with enhanced retry mechanism
async function initializeDatabase(retries = 3): Promise<ReturnType<typeof drizzle>> {
  if (!dbInstance) {
    let lastError: Error | null = null;
    let attempt = 1;

    while (attempt <= retries) {
      try {
        console.log(`[Database] Initializing connection (attempt ${attempt}/${retries})...`);
        console.log('[Database] Using database URL format:', dbUrl.replace(/:[^:]*@/, ':****@'));

        // Cleanup previous pool if it exists
        if (pool) {
          await pool.end().catch(console.error);
          pool = null;
        }

        // Create new pool with enhanced configuration
        pool = new Pool({
          connectionString: dbUrl,
          webSocketConstructor: createWebSocket,
          max: 1,
          connectionTimeoutMillis: 60000, // 60 seconds
          idleTimeoutMillis: 60000,
          maxUses: 5000,
          keepAlive: true,
          ssl: {
            rejectUnauthorized: false // Required for Neon database connection
          }
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
        console.error('[Database] Error details:', error);

        // Cleanup on failure
        if (pool) {
          await pool.end().catch(console.error);
          pool = null;
        }

        if (attempt === retries) {
          console.error('[Database] All connection attempts failed');
          throw lastError;
        }

        // Wait before next attempt (exponential backoff with jitter)
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

// Export database instance getter with connection verification
export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  try {
    if (!dbInstance) {
      return initializeDatabase();
    }

    // Verify existing connection
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

// Test database connection with enhanced error reporting
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