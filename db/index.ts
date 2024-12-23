import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Initialize WebSocket with basic configuration
const wsConstructor = (url: string): WebSocket => {
  const ws = new WebSocket(url, {
    rejectUnauthorized: false, // Required for development
    handshakeTimeout: 10000,
  });

  ws.on('error', (error) => {
    console.error('[Database] WebSocket error:', error.message);
  });

  ws.on('open', () => {
    console.log('[Database] WebSocket connection established');
  });

  return ws;
};

// Create connection pool with minimal configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: wsConstructor,
  max: 1,
});

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Export SQL tag for raw queries
export { sql };

// Test database connection with retries
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
        error instanceof Error ? error.message : 'Unknown error'
      );
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
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
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error(
      '[Database] Cleanup error:',
      error instanceof Error ? error.message : error
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);