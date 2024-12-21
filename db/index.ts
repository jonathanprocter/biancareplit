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

// PostgreSQL configuration
const getPostgresConfig = () => ({
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  connection: {
    application_name: 'medical_education_platform',
    ...(process.env.NODE_ENV === 'production' && {
      ssl: { rejectUnauthorized: false }
    })
  },
  types: {
    date: {
      to: 1114,
      from: [1082, 1083, 1114, 1184],
      serialize: (date: Date) => date.toISOString(),
      parse: (str: string) => new Date(str),
    },
  },
  onnotice: () => {},
  debug: process.env.NODE_ENV === 'development',
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

// Initialize database with improved error handling and retries
export async function initializeDatabase(retries = 3, delay = 2000): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries}`);
      
      // Test raw connection
      const client = getClient();
      const startTime = Date.now();
      await client`SELECT current_timestamp`;
      const connectionTime = Date.now() - startTime;
      console.log(`Raw connection successful (${connectionTime}ms)`);
      
      // Verify ORM connection
      const ormStartTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const ormTime = Date.now() - ormStartTime;
      console.log(`ORM connection verified (${ormTime}ms)`);
      
      console.log('Database initialization completed successfully');
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Database connection attempt ${attempt} failed:`, {
        error: lastError.message,
        stack: lastError.stack,
        timestamp: new Date().toISOString(),
      });

      if (attempt < retries) {
        const nextDelay = delay * attempt; // Exponential backoff
        console.log(`Retrying in ${nextDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
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
