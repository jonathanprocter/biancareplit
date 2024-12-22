import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Singleton instances
let _client: postgres.Sql<{}> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

// Enhanced PostgreSQL configuration with better connection handling
const getPostgresConfig = () => ({
  max: 20, // Increased pool size for better concurrency
  idle_timeout: 30, // Increased idle timeout
  connect_timeout: 20, // Increased connect timeout
  connection: {
    application_name: 'medical_education_platform',
    // SSL configuration for all environments
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
      // In development, we're more permissive with SSL
      ...(process.env.NODE_ENV !== 'production' && {
        rejectUnauthorized: false
      })
    },
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000,     // 30 seconds
    connectionTimeoutMillis: 30000,
  },
  types: {
    date: {
      to: 1114,
      from: [1082, 1083, 1114, 1184],
      serialize: (date: Date) => date.toISOString(),
      parse: (str: string) => new Date(str),
    },
  },
  // Enhanced error handling
  onnotice: (notice: any) => {
    console.log('PostgreSQL Notice:', notice);
  },
  onerror: (err: Error) => {
    console.error('PostgreSQL Error:', err);
  },
  debug: process.env.NODE_ENV === 'development',
  // Connection pool error handler
  onConnectionError: (err: Error, client: any) => {
    console.error('PostgreSQL Connection Error:', err);
    console.error('Failed Client:', client?.processID);
  },
});

// Get or create PostgreSQL client with proper error handling
export function getClient(): postgres.Sql<{}> {
  if (!_client) {
    try {
      console.log('Creating new PostgreSQL client...');
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is required');
      }
      _client = postgres(process.env.DATABASE_URL, getPostgresConfig());
    } catch (error) {
      console.error('Failed to create PostgreSQL client:', error);
      throw error instanceof Error ? error : new Error('Unknown error creating PostgreSQL client');
    }
  }
  return _client;
}

// Get or create Drizzle instance
function getDrizzle() {
  if (!_db) {
    try {
      console.log('Creating new Drizzle ORM instance...');
      const client = getClient();
      _db = drizzle(client, { schema });
    } catch (error) {
      console.error('Failed to create Drizzle instance:', error);
      throw error;
    }
  }
  return _db;
}

// Export database instance
export const db = getDrizzle();

// Initialize database with comprehensive error handling, retries, and health checks
export async function initializeDatabase(retries = 3, delay = 2000): Promise<void> {
  let lastError: Error | null = null;
  let client: postgres.Sql<{}> | null = null;
  
  // Configuration validation
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const validateConnection = async (client: postgres.Sql<{}>) => {
    const results = await Promise.all([
      client`SELECT current_timestamp`,
      client`SELECT current_database()`,
      client`SELECT version()`,
    ]);
    return {
      timestamp: results[0][0].current_timestamp,
      database: results[1][0].current_database,
      version: results[2][0].version,
    };
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries}`);
      
      // Step 1: Establish raw connection
      const startTime = Date.now();
      client = getClient();
      
      // Step 2: Validate connection with timeout
      const connectionTimeout = 30000; // 30 seconds
      const connectionInfo = await Promise.race([
        validateConnection(client),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection validation timeout')), connectionTimeout)
        )
      ]) as { timestamp: Date; database: string; version: string };
      
      const connectionTime = Date.now() - startTime;
      console.log(`Raw connection successful (${connectionTime}ms)`);
      console.log('Connection Info:', {
        database: connectionInfo.database,
        serverTime: connectionInfo.timestamp,
        postgresVersion: connectionInfo.version,
      });
      
      // Step 3: Verify ORM connection
      const ormStartTime = Date.now();
      await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public'
        ) as has_tables
      `);
      const ormTime = Date.now() - ormStartTime;
      console.log(`ORM connection verified (${ormTime}ms)`);
      
      // Step 4: Verify connection pool
      const poolStartTime = Date.now();
      const poolPromises = Array.from({ length: 5 }, () => 
        db.execute(sql`SELECT 1`)
      );
      await Promise.all(poolPromises);
      const poolTime = Date.now() - poolStartTime;
      console.log(`Connection pool verified (${poolTime}ms)`);
      
      console.log('Database initialization completed successfully', {
        totalTime: Date.now() - startTime,
        connectionTime,
        ormTime,
        poolTime,
      });
      return;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Enhanced error logging
      console.error(`Database connection attempt ${attempt} failed:`, {
        attempt,
        error: lastError.message,
        stack: lastError.stack,
        timestamp: new Date().toISOString(),
        retryDelay: delay * attempt,
      });

      // Check if error is fatal
      const isFatalError = error instanceof Error && (
        error.message.includes('password authentication failed') ||
        error.message.includes('role does not exist') ||
        error.message.includes('database does not exist')
      );

      if (isFatalError) {
        console.error('Fatal database error detected, stopping retry attempts');
        throw lastError;
      }

      if (attempt < retries) {
        const nextDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${nextDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
      }
    } finally {
      // Cleanup if needed
      if (client && lastError) {
        try {
          await client.end();
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
    }
  }

  const errorMessage = `Failed to initialize database after ${retries} attempts. Last error: ${lastError?.message}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Export cleanup function for external use
export async function closeDatabase() {
  if (_client) {
    try {
      console.log('Closing database connections...');
      await _client.end();
      console.log('Database connections closed successfully');
    } catch (error) {
      console.error('Error closing database connections:', error);
      throw error;
    } finally {
      _client = null;
      _db = null;
    }
  }
}

// Cleanup handler
process.on('beforeExit', async () => {
  await closeDatabase().catch(console.error);
});
