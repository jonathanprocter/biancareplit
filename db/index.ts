import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create the connection
const client = postgres(process.env.DATABASE_URL);

// Create the drizzle database instance
export const db = drizzle(client, { schema });

// Initialize database
async function initializeDatabase() {
  try {
    console.log("Initializing database connection...");
    // Test the connection
    await client.connect();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
}

// Export the initialize function
export { initializeDatabase };
