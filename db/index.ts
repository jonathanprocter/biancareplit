import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

console.log('[Database] Initializing connection pool...');

// Configure pool with simplified options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: class extends WebSocket {
    constructor(url: string, protocols?: string | string[]) {
      console.log('[Database] Attempting WebSocket connection...');
      super(url, protocols, {
        rejectUnauthorized: false,
        handshakeTimeout: 30000,
      });

      this.on('open', () => {
        console.log('[Database] WebSocket connection established successfully');
      });

      this.on('error', (error) => {
        console.error('[Database] WebSocket error:', error);
      });

      this.on('close', (code, reason) => {
        console.log('[Database] WebSocket closed:', code, reason.toString());
      });
    }
  },
  max: 10,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 60000,
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Test database connection with retries
export async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${retries}...`);
      const result = await pool.query('SELECT version()');
      console.log(
        '[Database] Connected successfully to PostgreSQL version:',
        result.rows[0].version,
      );
      return true;
    } catch (error) {
      console.error(
        `[Database] Connection attempt ${attempt}/${retries} failed:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (error instanceof Error) {
        console.error('[Database] Error stack:', error.stack);
      }

      if (attempt < retries) {
        console.log(`[Database] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('[Database] All connection attempts failed');
        throw error;
      }
    }
  }
  return false;
}

// Cleanup handler
async function cleanup() {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error(
      '[Database] Failed to close connection pool:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

export default db;
