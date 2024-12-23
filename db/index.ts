import * as schema from '@db/schema';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Configure database client with WebSocket support
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  webSocketConstructor: WebSocket,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Create drizzle database instance
const db = drizzle(pool, { schema });

// Test database connection function
async function testConnection() {
  try {
    const result = await pool.query('SELECT version()');
    console.info('[Database] Successfully connected to database:', result.rows[0].version);
    return true;
  } catch (error) {
    console.error(
      '[Database] Connection failed:',
      error instanceof Error ? error.message : 'Unknown error'
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
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

// Register cleanup handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Attempt initial connection
testConnection()
  .then(() => {
    console.info('[Database] Initial connection test passed');
  })
  .catch((error) => {
    console.error('[Database] Initial connection test failed:', error);
    process.exit(1);
  });

// Export database instance and utility functions
export { db, testConnection };