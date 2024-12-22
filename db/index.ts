import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// Custom error types for better error handling
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

class ConnectionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', details);
    this.name = 'ConnectionError';
  }
}

class ConfigurationError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

// Validate environment configuration
if (!process.env.DATABASE_URL) {
  throw new ConfigurationError('DATABASE_URL environment variable is required');
}

// Singleton instances with proper typing
let _client: postgres.Sql<{}> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Connection state tracking
let _isConnected = false;
let _lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 5000; // 5 seconds

// Enhanced PostgreSQL configuration with comprehensive error handling and monitoring
function getPostgresConfig(): postgres.Options<{}> {
  const isProduction = process.env.NODE_ENV === 'production';
  const config: postgres.Options<{}> = {
    max: isProduction ? 50 : 20, // Increased pool size in production
    idle_timeout: 60, // 1 minute idle timeout
    connect_timeout: 30, // 30 seconds connect timeout
    connection: {
      application_name: 'medical_education_platform',
      ssl: {
        rejectUnauthorized: isProduction,
        ...(process.env.NODE_ENV !== 'production' && {
          rejectUnauthorized: false,
        }),
      },
      statement_timeout: 60000, // 1 minute
      query_timeout: 60000, // 1 minute
      connectionTimeoutMillis: 30000, // 30 seconds
    },
    types: {
      date: {
        to: 1114,
        from: [1082, 1083, 1114, 1184],
        serialize: (date: Date) => date.toISOString(),
        parse: (str: string) => new Date(str),
      },
    },
    debug: process.env.NODE_ENV === 'development',
    transform: {
      undefined: null, // Convert undefined to null for better PostgreSQL compatibility
    },
    onnotice: (notice: postgres.NoticeMessage) => {
      console.log('[Database Notice]', {
        severity: notice.severity,
        code: notice.code,
        message: notice.message,
        timestamp: new Date().toISOString(),
      });
    },
    onerror: (err: Error) => {
      console.error('[Database Error]', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
      _isConnected = false;
    },
    onconnect: () => {
      console.log('[Database] New connection established', {
        timestamp: new Date().toISOString(),
      });
      _isConnected = true;
      _lastConnectionAttempt = Date.now();
    },
    onconnectionerror: (err: Error, client: postgres.Client) => {
      console.error('[Database] Connection error', {
        error: err.message,
        stack: err.stack,
        clientId: client?.processID,
        timestamp: new Date().toISOString(),
      });
      _isConnected = false;
    },
  };

  return config;
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

// Create the database instance
export const db = await createDrizzleInstance();

// Health check function
export async function checkDatabaseHealth() {
  if (!_client || !_isConnected) {
    return { healthy: false, error: 'No active database connection' };
  }

  try {
    const [
      timestampResult,
      databaseResult,
      versionResult,
      tableCountResult,
      connectionCountResult
    ] = await Promise.all([
      _client`SELECT current_timestamp`,
      _client`SELECT current_database()`,
      _client`SELECT version()`,
      _client`SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'`,
      _client`SELECT count(*) as connection_count FROM pg_stat_activity WHERE datname = current_database()`
    ]);

    return {
      healthy: true,
      timestamp: timestampResult[0].current_timestamp,
      database: databaseResult[0].current_database,
      version: versionResult[0].version,
      tableCount: tableCountResult[0].table_count,
      connectionCount: connectionCountResult[0].connection_count,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    _isConnected = false;
    return {
      healthy: false,
      error: error instanceof Error ? error.message : String(error),
      lastCheck: new Date().toISOString(),
    };
  }
}

// Enhanced database cleanup with connection pool management
export async function closeDatabase(): Promise<void> {
  if (_client || _db) {
    try {
      console.log('[Database] Initiating graceful shutdown...');

      // Close active queries first
      if (_db) {
        try {
          await _db.execute(sql`SELECT pg_cancel_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = current_database() 
            AND pid <> pg_backend_pid()`);
          console.log('[Database] Active queries terminated');
        } catch (error) {
          console.warn('[Database] Error terminating queries:', error);
        }
      }

      // Close client connections
      if (_client) {
        await _client.end({ timeout: 5000 });
        console.log('[Database] All connections closed successfully');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Database] Error during cleanup:', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw new DatabaseError('Failed to close database connections', 'CLEANUP_ERROR', {
        originalError: errorMessage,
      });
    } finally {
      _client = null;
      _db = null;
      _isConnected = false;
    }
  }
}

// Enhanced cleanup handlers
process.on('beforeExit', async () => {
  console.log('[Database] Process exit detected, initiating cleanup...');
  await closeDatabase().catch(error => {
    console.error('[Database] Cleanup error during exit:', error);
    process.exit(1);
  });
});

process.on('SIGINT', async () => {
  console.log('[Database] Interrupt signal received, initiating cleanup...');
  await closeDatabase().catch(error => {
    console.error('[Database] Cleanup error during interrupt:', error);
    process.exit(1);
  });
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Database] Termination signal received, initiating cleanup...');
  await closeDatabase().catch(error => {
    console.error('[Database] Cleanup error during termination:', error);
    process.exit(1);
  });
  process.exit(0);
});