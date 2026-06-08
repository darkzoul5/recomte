import Database from 'better-sqlite3';
import { REQUIRED_TABLES } from '../db/schema.js';
import { getDbPath } from '../src/utils/storage-paths.js';

const dbPath = getDbPath();

try {
  // Open database connection
  const db = new Database(dbPath);
  
  // Check if required tables exist
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map(row => row.name);
  
  const missingTables = REQUIRED_TABLES.filter(t => !tables.includes(t));
  
  db.close();
  
  if (missingTables.length > 0) {
    console.error(`✗ Database schema incomplete. Missing tables: ${missingTables.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✓ Database is properly initialized');
  process.exit(0);
} catch (error) {
  console.error(`✗ Database validation failed: ${error.message}`);
  process.exit(1);
}
