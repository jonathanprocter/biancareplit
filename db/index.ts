import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from './schema';

// Configure Neon database settings
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Configure database client with WebSocket support
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Test database connection function
export async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.info('[Database] Successfully connected to database');
    return true;
  } catch (error) {
    console.error(
      '[Database] Connection failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    throw error;
  }
}

// Handle cleanup on process termination
async function cleanup() {
  try {
    await pool.end();
    console.info('[Database] Connection pool closed successfully');
  } catch (error) {
    console.error(
      '[Database] Failed to close connection pool:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
