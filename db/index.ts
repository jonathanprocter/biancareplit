import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@0.0.0.0:5432/postgres';

const client = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
  connection: {
    application_name: 'nclex_study_app',
  },
});

export const db = drizzle(client, { schema });

export async function initializeDatabase() {
  try {
    console.log('Initializing database connection...');
    await client`SELECT 1`;
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    if (error instanceof Error) {
      throw new Error(`Database initialization failed: ${error.message}`);
    }
    throw new Error('Database initialization failed with unknown error');
  }
}
