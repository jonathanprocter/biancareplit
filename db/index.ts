import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connection: {
    application_name: 'nclex_study_app',
  },
  types: {
    bigint: postgres.BigInt,
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
    process.exit(1);
  }
}
