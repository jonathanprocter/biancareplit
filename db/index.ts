import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: {
    rejectUnauthorized: false,
  },
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connection_timeout: 30,
});

export const db = drizzle(client, { schema });

export async function initializeDatabase() {
  try {
    await db.execute(sql`SELECT NOW()`);
    console.log('[Database] Connection established successfully');
    return true;
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
    console.error(
      '[Database] Failed to connect:',
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

process.once('SIGINT', () => client.end());
process.once('SIGTERM', () => client.end());
