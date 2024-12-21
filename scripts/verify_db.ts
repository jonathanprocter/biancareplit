import { db, initializeDatabase } from '../db';
import { sql } from 'drizzle-orm';

async function verifyDatabaseConnection() {
  try {
    console.log('Starting database verification...');
    
    await initializeDatabase();
    
    // Test basic query
    const result = await db.execute(sql`SELECT current_timestamp`);
    console.log('Database connection verified:', result);
    
    console.log('Database verification completed successfully');
    return true;
  } catch (error) {
    console.error('Database verification failed:', error);
    throw error;
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifyDatabaseConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { verifyDatabaseConnection };
