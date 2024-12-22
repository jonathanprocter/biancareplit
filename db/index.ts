import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';
import ws from 'ws';

// Custom error types for better error handling
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Validate environment configuration
if (!process.env.DATABASE_URL) {
  throw new DatabaseError('DATABASE_URL environment variable is required', 'CONFIG_ERROR');
}

// Initialize database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Health check function
export async function checkDatabaseHealth() {
  try {
    const result = await pool.query('SELECT 1');
    const status = {
      healthy: result.rows.length > 0,
      timestamp: new Date().toISOString(),
    };
    console.log('[Database] Health check passed:', status);
    return status;
  } catch (error) {
    const status = {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
    console.error('[Database] Health check failed:', status);
    return status;
  }
}

// Enhanced client initialization with connection management and retries
async function createClient(): Promise<postgres.Sql<{}>> {
  const now = Date.now();
  if (_client && _isConnected) {
    return _client;
  }

  // Prevent connection spam
  if (now - _lastConnectionAttempt < CONNECTION_RETRY_INTERVAL) {
    throw new ConnectionError('Too many connection attempts', {
      lastAttempt: new Date(_lastConnectionAttempt).toISOString(),
      nextAttemptIn: CONNECTION_RETRY_INTERVAL - (now - _lastConnectionAttempt),
    });
  }

  try {
    console.log('[Database] Initializing PostgreSQL client...');
    _lastConnectionAttempt = now;

    if (!process.env.DATABASE_URL) {
      throw new ConfigurationError('DATABASE_URL environment variable is required');
    }

    const client = postgres(process.env.DATABASE_URL, getPostgresConfig());

    // Verify connection
    await client`SELECT 1`; // Simple connection test
    _client = client;
    _isConnected = true;

    console.log('[Database] PostgreSQL client initialized successfully');
    return client;
  } catch (error) {
    _isConnected = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Database] Failed to create PostgreSQL client:', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    throw new ConnectionError('Failed to create PostgreSQL client', {
      originalError: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

// Enhanced Drizzle instance management
async function createDrizzleInstance() {
  if (_db && _isConnected) {
    return _db;
  }

  try {
    console.log('[Database] Creating Drizzle ORM instance...');
    const client = await createClient();
    _db = drizzle(client, { schema });

    // Verify ORM connection
    await _db.execute(sql`SELECT 1`);
    console.log('[Database] Drizzle ORM instance created successfully');

    return _db;
  } catch (error) {
    _isConnected = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Database] Failed to create Drizzle instance:', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    throw new DatabaseError('Failed to create Drizzle instance', 'ORM_ERROR', {
      originalError: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

// Database cleanup function
export async function closeDatabase(): Promise<void> {
  try {
    console.log('[Database] Initiating graceful shutdown...');
    await sql.end();
    console.log('[Database] Database connections closed successfully');
  } catch (error) {
    console.error('[Database] Error during cleanup:', error);
    throw error;
  }
}

// Cleanup handlers
process.on('SIGINT', () => closeDatabase());
process.on('SIGTERM', () => closeDatabase());
process.on('beforeExit', () => closeDatabase());
