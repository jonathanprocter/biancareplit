import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

console.log('[Database] Initializing connection pool...');

// Configure pool with WebSocket options
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: WebSocket,
  max: 10,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  ssl: true,
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });

// Test database connection with retries
export async function testConnection(retries = 3, delay = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Database] Connection attempt ${attempt}/${retries}...`);
      await pool.query('SELECT 1');
      console.log('[Database] Database connection successful');
      return true;
    } catch (error) {
      console.error(
        `[Database] Connection attempt ${attempt}/${retries} failed:`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      if (error instanceof Error && error.stack) {
        console.error('[Database] Error stack:', error.stack);
      }

      if (attempt < retries) {
        console.log(`[Database] Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('[Database] All connection attempts failed');
        return false;
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
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      // Add proper error handling here
    } else {
      console.error('An unknown error occurred:', error); {
    console.error(
      '[Database] Failed to close connection pool:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
