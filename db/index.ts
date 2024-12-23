import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

console.log('[Database] Initializing connection pool...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: WebSocket,
  max: 10,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  ssl: true,
  maxUses: 7500, // Add connection recycling
  retryInterval: 100, // Add retry interval
  maxRetries: 3, // Add max retries
});

export const db = drizzle(pool, { schema });

export async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${retries}...`);
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        console.log('[Database] Database connection successful');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(
        `[Database] Connection attempt ${attempt}/${retries} failed:`,
        error instanceof Error ? error.message : 'Unknown error',
      );

      if (attempt < retries) {
        console.log(`[Database] Waiting ${delay}ms before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('[Database] All connection attempts failed');
        return false;
      }
    }
  }
  return false;
}

async function cleanup(): Promise<void> {
  try {
    await pool.end();
    console.log('[Database] Connection pool closed successfully');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error(
      '[Database] Failed to close connection pool:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
